create table public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid references public.job_requests (id) on delete cascade,
  type text not null check (type in ('proposal_received', 'proposal_accepted', 'payment_confirmed', 'new_message', 'completion_requested', 'completion_confirmed', 'dispute_opened', 'dispute_update')),
  title text not null check (char_length(title) between 1 and 100),
  summary text not null check (char_length(summary) between 1 and 220),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index app_notifications_user_created_idx on public.app_notifications (user_id, created_at desc);
alter table public.app_notifications enable row level security;
revoke all on public.app_notifications from public, anon, authenticated;
grant select on public.app_notifications to authenticated;
grant update (read_at) on public.app_notifications to authenticated;
create policy "users read their own notifications"
on public.app_notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "users mark their own notifications read"
on public.app_notifications for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create or replace function public.notify_new_job_proposal()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_client uuid;
begin
  select j.client_id into v_client from public.job_requests j where j.id = new.job_id;
  if v_client is not null then
    insert into public.app_notifications (user_id, job_id, type, title, summary)
    values (v_client, new.job_id, 'proposal_received', 'Nova proposta recebida', 'Um profissional respondeu ao seu pedido.');
  end if;
  return new;
end;
$$;
create trigger job_proposal_notify_client after insert on public.job_proposals
for each row execute function public.notify_new_job_proposal();

create or replace function public.notify_accepted_job_proposal()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status is distinct from new.status and new.status = 'accepted' then
    insert into public.app_notifications (user_id, job_id, type, title, summary)
    values (new.worker_id, new.job_id, 'proposal_accepted', 'Sua proposta foi aceita', 'A contratação foi confirmada. Abra a conversa para combinar os detalhes.');
  end if;
  return new;
end;
$$;
create trigger job_proposal_notify_worker after update of status on public.job_proposals
for each row execute function public.notify_accepted_job_proposal();

create or replace function public.notify_job_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_client uuid; v_worker uuid; v_recipient uuid;
begin
  select j.client_id, j.assigned_worker_id into v_client, v_worker
  from public.job_requests j where j.id = new.job_id;
  if new.sender_id = v_client then v_recipient := v_worker;
  elsif new.sender_id = v_worker then v_recipient := v_client;
  end if;
  if v_recipient is not null then
    insert into public.app_notifications (user_id, job_id, type, title, summary)
    values (v_recipient, new.job_id, 'new_message', 'Nova mensagem', 'Você recebeu uma mensagem sobre uma contratação.');
  end if;
  return new;
end;
$$;
create trigger job_message_notify_participant after insert on public.job_messages
for each row execute function public.notify_job_message();

create or replace function public.notify_job_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_type text; v_title text; v_summary text; v_recipient uuid;
begin
  if old.status is distinct from new.status and old.status = 'awaiting_payment' and new.status = 'in_progress' then
    insert into public.app_notifications (user_id, job_id, type, title, summary)
    values
      (new.client_id, new.id, 'payment_confirmed', 'Pagamento confirmado', 'A contratação foi confirmada. A conversa com o profissional já está disponível.'),
      (new.assigned_worker_id, new.id, 'payment_confirmed', 'Nova contratação confirmada', 'O pagamento foi confirmado. Abra a conversa para combinar os detalhes.');
    return new;
  elsif old.status is distinct from new.status and new.status = 'completion_pending' then
    v_type := 'completion_requested'; v_title := 'Serviço marcado como concluído';
    v_summary := 'Confira o serviço e confirme a conclusão ou abra uma solicitação de suporte.';
    v_recipient := new.client_id;
  elsif old.status is distinct from new.status and new.status = 'completed' then
    v_type := 'completion_confirmed'; v_title := 'Conclusão confirmada';
    v_summary := 'A contratação foi concluída. Agora vocês podem avaliar a experiência.';
    v_recipient := new.assigned_worker_id;
  end if;
  if v_recipient is not null then
    insert into public.app_notifications (user_id, job_id, type, title, summary)
    values (v_recipient, new.id, v_type, v_title, v_summary);
  end if;
  return new;
end;
$$;
create trigger job_status_notify_participant after update of status on public.job_requests
for each row execute function public.notify_job_status_change();

create or replace function public.notify_support_dispute()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.app_notifications (user_id, job_id, type, title, summary)
  select s.user_id, new.job_id, 'dispute_opened', 'Solicitação de suporte', 'Uma contratação precisa de análise da equipe.'
  from public.staff_members s where s.role in ('owner', 'support');
  return new;
end;
$$;
create trigger job_dispute_notify_support after insert on public.job_disputes
for each row execute function public.notify_support_dispute();

create or replace function public.notify_dispute_response()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_client uuid; v_worker uuid;
begin
  if old.status = 'open' and new.status = 'resolved' then
    select j.client_id, j.assigned_worker_id into v_client, v_worker
    from public.job_requests j where j.id = new.job_id;
    insert into public.app_notifications (user_id, job_id, type, title, summary)
    values
      (v_client, new.job_id, 'dispute_update', 'Atualização do suporte', 'A equipe registrou uma resposta à solicitação. Consulte os detalhes.'),
      (v_worker, new.job_id, 'dispute_update', 'Atualização do suporte', 'A equipe registrou uma resposta à solicitação. Consulte os detalhes.');
  end if;
  return new;
end;
$$;
create trigger job_dispute_notify_participants after update of status on public.job_disputes
for each row execute function public.notify_dispute_response();

-- Keep the notification feed private and synced across the mobile and web clients.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
    and schemaname = 'public' and tablename = 'app_notifications') then
    alter publication supabase_realtime add table public.app_notifications;
  end if;
end;
$$;
