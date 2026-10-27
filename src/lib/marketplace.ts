import { supabase } from '@/lib/supabase';
import type { QuoteRequest } from '@/components/QuoteRequestModal';
import type { Job } from '@/components/JobCard';
import { categories } from '@/constants/brand';
import { parseBrazilianAmount, parseBrazilianDate } from '@/lib/format';

const categoryIds: Record<string, string> = {
  Limpeza: 'cleaning',
  Reparos: 'repairs',
  Elétrica: 'electrical',
  Instalação: 'installation',
  Pintura: 'painting',
  Babá: 'babysitting',
  Automação: 'automation',
  Outro: 'other',
};

export async function createJobRequest(request: QuoteRequest, userId: string) {
  const preferredDate = parseBrazilianDate(request.date);
  if (request.date.trim() && !preferredDate) throw new Error('Informe a data no formato DD/MM/AAAA.');
  const budget = parseBrazilianAmount(request.budget);
  if (budget !== null && (!Number.isFinite(budget) || budget < 0)) throw new Error('Confira o valor informado para o orçamento.');

  const { data: job, error } = await supabase.from('job_requests').insert({
    client_id: userId,
    category_id: categoryIds[request.category] ?? 'other',
    description: request.description,
    city: request.city,
    state_code: 'RS',
    preferred_date: preferredDate,
    budget_max: budget,
    requires_epi: request.requiresEpi,
    epi_details: request.requiresEpi ? request.epiDetails.trim() || null : null,
    requires_mei: request.requiresMei,
    requires_invoice: request.requiresInvoice,
  }).select('id').single();
  if (error) throw error;

  for (const [index, uri] of request.photos.entries()) {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Não foi possível ler uma das fotos selecionadas.');
    const blob = await response.blob();
    const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${job.id}/${userId}/${Date.now()}-${index}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('job-photos').upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: false,
    });
    if (uploadError) throw uploadError;
    const { error: photoError } = await supabase.from('job_photos').insert({ job_id: job.id, uploaded_by: userId, storage_path: path });
    if (photoError) throw photoError;
  }

  return job.id as string;
}

export type VerifiedServiceCard = {
  id: string;
  workerId: string;
  name: string;
  title: string;
  city: string;
  category: string;
  icon: string;
  color: string;
  priceLabel: string;
  ratingAverage: number | null;
  ratingCount: number;
};

export async function getVerifiedWorkerServices(): Promise<VerifiedServiceCard[]> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const viewerId = sessionData.session?.user.id ?? null;
  const { data: services, error: servicesError } = await supabase.from('worker_services')
    .select('id, worker_id, category_id, title, city, starting_price, price_unit')
    .eq('active', true)
    .eq('state_code', 'RS')
    .order('created_at', { ascending: false })
    .limit(60);
  if (servicesError) throw servicesError;
  if (!services?.length) return [];

  const workerIds = [...new Set(services.map((service) => service.worker_id))];
  const [{ data: profiles, error: profilesError }, { data: ratings, error: ratingsError }, ownProfileResult] = await Promise.all([
    supabase.from('profiles').select('id, public_name, city').in('id', workerIds),
    supabase.rpc('get_public_worker_ratings', { p_worker_ids: workerIds }),
    viewerId && workerIds.includes(viewerId)
      ? supabase.from('profiles').select('can_work, verification_status').eq('id', viewerId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (profilesError) throw profilesError;
  if (ratingsError) throw ratingsError;
  if (ownProfileResult.error) throw ownProfileResult.error;
  const ownProfileIsVerified = ownProfileResult.data?.can_work === true && ownProfileResult.data.verification_status === 'verified';

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  type WorkerRatingRow = { worker_id: string; average_rating: number; review_count: number };
  const ratingsByWorker = new Map<string, WorkerRatingRow>(
    ((ratings ?? []) as WorkerRatingRow[]).map((rating) => [rating.worker_id, rating]),
  );
  const categoryById = new Map(Object.entries(categoryIds).map(([name, id]) => [id, name]));
  const categoryMetaByName = new Map(categories.map((category) => [category.name, category]));
  const priceUnitLabel: Record<string, string> = {
    quote: 'Orçamento personalizado',
    hour: 'Valor por hora',
    job: 'Valor por serviço',
    day: 'Valor por diária',
  };

  return services.flatMap((service) => {
    if (service.worker_id === viewerId && !ownProfileIsVerified) return [];
    const profile = profileById.get(service.worker_id);
    if (!profile) return [];
    const category = categoryById.get(service.category_id) ?? 'Outro';
    const categoryMeta = categoryMetaByName.get(category);
    const startingPrice = service.starting_price === null ? null : Number(service.starting_price);
    return [{
      id: service.id,
      workerId: service.worker_id,
      name: profile.public_name,
      title: service.title,
      city: service.city || profile.city || 'Rio Grande do Sul',
      category,
      ratingAverage: ratingsByWorker.has(service.worker_id) ? Number(ratingsByWorker.get(service.worker_id)?.average_rating) : null,
      ratingCount: Number(ratingsByWorker.get(service.worker_id)?.review_count ?? 0),
      icon: categoryMeta?.icon ?? '✦',
      color: categoryMeta?.color ?? '#E8C6A7',
      priceLabel: startingPrice === null
        ? priceUnitLabel[service.price_unit] ?? 'Orçamento personalizado'
        : `A partir de ${(startingPrice * 1.1).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} com taxa CONTRATEI incluída`,
    }];
  });
}

type JobRow = {
  id: string;
  category_id: string;
  description: string;
  city: string;
  preferred_date: string | null;
  budget_max: number | null;
  requires_epi: boolean;
  epi_details: string | null;
  requires_mei: boolean;
  requires_invoice: boolean;
};

export async function getOpenJobs(viewerId: string): Promise<Job[]> {
  const { data, error } = await supabase.from('job_requests')
    .select('id, category_id, description, city, preferred_date, budget_max, requires_epi, epi_details, requires_mei, requires_invoice')
    .eq('status', 'open')
    .neq('client_id', viewerId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as JobRow[];
  const jobIds = rows.map((row) => row.id);
  let photoUrlsByJob = new Map<string, string[]>();
  if (jobIds.length) {
    const { data: viewer, error: viewerError } = await supabase.from('profiles')
      .select('can_work, verification_status').eq('id', viewerId).single();
    if (viewerError) throw viewerError;
    if (viewer.can_work && viewer.verification_status === 'verified') {
      const { data: photos, error: photosError } = await supabase.from('job_photos')
        .select('job_id, storage_path').in('job_id', jobIds);
      if (photosError) throw photosError;
      const signedPhotos = await Promise.all((photos ?? []).map(async (photo) => {
        const { data: signed, error: signedError } = await supabase.storage.from('job-photos').createSignedUrl(photo.storage_path, 300);
        if (signedError) throw signedError;
        return { jobId: photo.job_id, url: signed.signedUrl };
      }));
      photoUrlsByJob = signedPhotos.reduce((result, photo) => {
        result.set(photo.jobId, [...(result.get(photo.jobId) ?? []), photo.url]);
        return result;
      }, new Map<string, string[]>());
    }
  }

  const categoriesById = new Map(Object.entries(categoryIds).map(([name, id]) => [id, name]));
  const iconsByName = new Map(categories.map((category) => [category.name, category.icon]));
  return rows.map((row) => {
    const category = categoriesById.get(row.category_id) ?? 'Outro';
    const requirements = [
      row.requires_epi ? `EPI obrigatório${row.epi_details ? `: ${row.epi_details}` : ''}` : '',
      row.requires_mei ? 'MEI ativo' : '',
      row.requires_invoice ? 'Nota fiscal' : '',
    ].filter(Boolean);
    return {
      id: row.id,
      title: row.description.split(/[.!?\n]/)[0].slice(0, 88) || 'Serviço solicitado',
      category,
      icon: iconsByName.get(category) ?? '✦',
      city: row.city,
      when: row.preferred_date ? new Date(`${row.preferred_date}T12:00:00`).toLocaleDateString('pt-BR') : 'Data a combinar',
      price: Number(row.budget_max ?? 0),
      verified: false,
      requirements,
      description: row.description,
      photoUrls: photoUrlsByJob.get(row.id) ?? [],
    };
  });
}

export async function createProposal(jobId: string, workerId: string, amount: number, message: string) {
  const { error } = await supabase.from('job_proposals').insert({
    job_id: jobId,
    worker_id: workerId,
    amount,
    message,
  });
  if (error) throw error;
}

export async function withdrawProposal(proposalId: string, workerId: string) {
  const { data, error } = await supabase.from('job_proposals').update({ status: 'withdrawn' })
    .eq('id', proposalId).eq('worker_id', workerId).eq('status', 'pending').select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Esta proposta não pode mais ser retirada. Atualize a lista.');
}

export async function cancelOpenJobRequest(jobId: string) {
  const { error } = await supabase.rpc('cancel_open_job_request', { p_job_id: jobId });
  if (error) throw error;
}

export async function getMercadoPagoConnectionStatus(): Promise<{ connected: boolean; connectedAt: string | null }> {
  const { data, error } = await supabase.functions.invoke('mercado-pago-connection-status', { body: {} });
  if (error) throw error;
  if (typeof data?.connected !== 'boolean') throw new Error('Resposta inválida ao consultar a conexão de recebimentos.');
  return { connected: data.connected, connectedAt: data.connectedAt ?? null };
}

export async function startMercadoPagoConnection(platform: 'web' | 'native'): Promise<string> {
  const { data, error } = await supabase.functions.invoke('mercado-pago-oauth-start', { body: { platform } });
  if (error) throw error;
  if (typeof data?.authorizationUrl !== 'string') {
    throw new Error(data?.error || 'Não foi possível iniciar a conexão com o Mercado Pago.');
  }
  return data.authorizationUrl;
}

export async function createMercadoPagoCheckout(proposalId: string, platform: 'web' | 'native'): Promise<string> {
  const { data, error } = await supabase.functions.invoke('mercado-pago-create-checkout', { body: { proposalId, platform } });
  if (error) throw error;
  if (typeof data?.checkoutUrl !== 'string' || !data.checkoutUrl.startsWith('https://')) {
    throw new Error(data?.error || 'Não foi possível iniciar o pagamento.');
  }
  return data.checkoutUrl;
}

export type JobChat = {
  id: string;
  title: string;
  status: ClientJob['status'];
  isClient: boolean;
  otherPartyName: string;
  messages: { id: string; senderId: string; body: string; createdAt: string }[];
};

export async function getJobChat(jobId: string): Promise<JobChat> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error('Entre na sua conta para abrir a conversa.');
  const { data: job, error: jobError } = await supabase.from('job_requests')
    .select('id, client_id, assigned_worker_id, status, description')
    .eq('id', jobId).single();
  if (jobError) throw new Error('Esta conversa não está disponível para sua conta.');
  if (!job.assigned_worker_id || !['in_progress', 'completion_pending', 'completed'].includes(job.status)) {
    throw new Error('A conversa abre depois que a contratação for confirmada.');
  }
  const otherPartyId = authData.user.id === job.client_id ? job.assigned_worker_id : job.client_id;
  const [{ data: otherParty, error: profileError }, { data: messages, error: messagesError }] = await Promise.all([
    supabase.from('profiles').select('public_name').eq('id', otherPartyId).single(),
    supabase.from('job_messages').select('id, sender_id, body, created_at').eq('job_id', jobId).order('created_at', { ascending: true }),
  ]);
  if (profileError) throw profileError;
  if (messagesError) throw messagesError;
  return {
    id: job.id,
    title: job.description.split(/[.!?\n]/)[0].slice(0, 100) || 'Serviço contratado',
    status: job.status,
    isClient: authData.user.id === job.client_id,
    otherPartyName: otherParty.public_name,
    messages: (messages ?? []).map((message) => ({ id: message.id, senderId: message.sender_id, body: message.body, createdAt: message.created_at })),
  };
}

export async function sendJobMessage(jobId: string, body: string) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Entre na sua conta para enviar mensagens.');
  const { error: sendError } = await supabase.from('job_messages').insert({ job_id: jobId, sender_id: data.user.id, body: body.trim() });
  if (sendError) throw sendError;
}

export async function requestJobCompletion(jobId: string) {
  const { error } = await supabase.rpc('request_job_completion', { p_job_id: jobId });
  if (error) throw error;
}

export async function confirmJobCompletion(jobId: string) {
  const { error } = await supabase.rpc('confirm_job_completion', { p_job_id: jobId });
  if (error) throw error;
}

export async function submitJobReview(jobId: string, rating: number, comment: string) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Entre na sua conta para avaliar.');
  const { data: job, error: jobError } = await supabase.from('job_requests')
    .select('client_id, assigned_worker_id, status').eq('id', jobId).single();
  if (jobError) throw jobError;
  if (job.status !== 'completed' || !job.assigned_worker_id) throw new Error('Você poderá avaliar após a conclusão confirmada.');
  const subjectId = data.user.id === job.client_id ? job.assigned_worker_id : job.client_id;
  const { error: reviewError } = await supabase.from('job_reviews').insert({
    job_id: jobId,
    reviewer_id: data.user.id,
    subject_id: subjectId,
    rating,
    comment: comment.trim(),
  });
  if (reviewError) throw reviewError;
}

export async function getJobReviewContext(jobId: string) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error('Entre na sua conta para avaliar.');
  const { data: job, error: jobError } = await supabase.from('job_requests')
    .select('client_id, assigned_worker_id, status').eq('id', jobId).single();
  if (jobError) throw new Error('Este serviço não está disponível para sua conta.');
  if (job.status !== 'completed' || !job.assigned_worker_id) throw new Error('As avaliações ficam disponíveis após a conclusão confirmada.');
  const subjectId = authData.user.id === job.client_id ? job.assigned_worker_id : job.client_id;
  const [{ data: subject, error: subjectError }, { data: review, error: reviewError }] = await Promise.all([
    supabase.from('profiles').select('public_name').eq('id', subjectId).single(),
    supabase.from('job_reviews').select('id').eq('job_id', jobId).eq('reviewer_id', authData.user.id).maybeSingle(),
  ]);
  if (subjectError) throw subjectError;
  if (reviewError) throw reviewError;
  return { subjectName: subject.public_name as string, alreadyReviewed: Boolean(review) };
}

export type JobDispute = { id: string; reason: string; details: string; status: 'open' | 'resolved' | 'closed'; resolution: string | null };

export async function getJobDispute(jobId: string): Promise<JobDispute | null> {
  const { data, error } = await supabase.from('job_disputes')
    .select('id, reason, details, status, resolution').eq('job_id', jobId).maybeSingle();
  if (error) throw error;
  return data;
}

export type SupportDispute = JobDispute & { jobId: string; openedByName: string; clientName: string; workerName: string; jobTitle: string; city: string };

export async function getSupportDisputes(userId: string): Promise<SupportDispute[]> {
  const role = await getReviewerRole(userId);
  if (role !== 'owner' && role !== 'support') throw new Error('Somente owner ou suporte pode revisar solicitações.');
  const { data: disputes, error: disputeError } = await supabase.from('job_disputes')
    .select('id, job_id, opened_by, reason, details, status, resolution').eq('status', 'open').order('created_at', { ascending: true });
  if (disputeError) throw disputeError;
  if (!disputes?.length) return [];
  const jobIds = disputes.map((item) => item.job_id);
  const { data: jobs, error: jobsError } = await supabase.from('job_requests')
    .select('id, client_id, assigned_worker_id, description, city').in('id', jobIds);
  if (jobsError) throw jobsError;
  const profileIds = [...new Set([
    ...disputes.map((item) => item.opened_by),
    ...(jobs ?? []).flatMap((job) => [job.client_id, job.assigned_worker_id].filter(Boolean) as string[]),
  ])];
  const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, public_name').in('id', profileIds);
  if (profilesError) throw profilesError;
  const jobById = new Map((jobs ?? []).map((job) => [job.id, job]));
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile.public_name]));
  return disputes.map((item) => {
    const job = jobById.get(item.job_id);
    return {
      id: item.id, jobId: item.job_id, reason: item.reason, details: item.details,
      status: item.status, resolution: item.resolution,
      openedByName: profileById.get(item.opened_by) ?? 'Usuário CONTRATEI',
      clientName: profileById.get(job?.client_id ?? '') ?? 'Contratante',
      workerName: profileById.get(job?.assigned_worker_id ?? '') ?? 'Profissional',
      jobTitle: job?.description.split(/[.!?\n]/)[0].slice(0, 100) ?? 'Serviço contratado',
      city: job?.city ?? '',
    };
  });
}

export async function resolveJobDispute(disputeId: string, resolution: string) {
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user) throw new Error('Entre na conta de suporte para responder.');
  const { data: updated, error } = await supabase.from('job_disputes').update({
    status: 'resolved', resolution: resolution.trim(), resolved_by: data.user.id,
  }).eq('id', disputeId).eq('status', 'open').select('id').maybeSingle();
  if (error) throw error;
  if (!updated) throw new Error('Esta solicitação já foi respondida. Atualize a fila.');
}

export type AppNotification = { id: string; jobId: string | null; type: string; title: string; summary: string; readAt: string | null; createdAt: string };

export async function getMyNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase.from('app_notifications')
    .select('id, job_id, type, title, summary, read_at, created_at')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []).map((item) => ({
    id: item.id, jobId: item.job_id, type: item.type, title: item.title,
    summary: item.summary, readAt: item.read_at, createdAt: item.created_at,
  }));
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase.from('app_notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId);
  if (error) throw error;
}

export async function openJobDispute(jobId: string, reason: string, details: string) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Entre na sua conta para solicitar suporte.');
  const { error: insertError } = await supabase.from('job_disputes').insert({ job_id: jobId, opened_by: data.user.id, reason, details: details.trim() });
  if (insertError) throw insertError;
}

export type ClientProposal = {
  id: string;
  workerName: string;
  workerCity: string;
  amount: number;
  platformFee: number;
  customerTotal: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  createdAt: string;
};

export type ClientJob = {
  id: string;
  title: string;
  category: string;
  city: string;
  status: 'open' | 'awaiting_payment' | 'in_progress' | 'completion_pending' | 'completed' | 'cancelled';
  createdAt: string;
  paymentProposalId: string | null;
  proposals: ClientProposal[];
};

export type WorkerProposal = ClientProposal & {
  jobId: string;
  jobTitle: string;
  category: string;
  jobCity: string;
  jobStatus: 'open' | 'awaiting_payment' | 'in_progress' | 'completion_pending' | 'completed' | 'cancelled' | 'unavailable';
};

export async function getWorkerProposals(workerId: string): Promise<WorkerProposal[]> {
  const { data: proposals, error: proposalsError } = await supabase.from('job_proposals')
    .select('id, job_id, amount, platform_fee, customer_total, message, status, created_at')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false });
  if (proposalsError) throw proposalsError;

  if (!proposals?.length) return [];

  const jobIds = [...new Set(proposals.map((proposal) => proposal.job_id))];
  const { data: jobs, error: jobsError } = await supabase.from('job_requests')
    .select('id, category_id, description, city, status')
    .in('id', jobIds);
  if (jobsError) throw jobsError;
  const jobById = new Map((jobs ?? []).map((job) => [job.id, job]));
  const categoryById = new Map(Object.entries(categoryIds).map(([name, id]) => [id, name]));

  return proposals.map((proposal) => {
    const job = jobById.get(proposal.job_id);
    return {
      id: proposal.id,
      jobId: proposal.job_id,
      jobTitle: job?.description.split(/[.!?\n]/)[0].slice(0, 100) || 'Pedido indisponível',
      category: categoryById.get(job?.category_id ?? '') ?? 'Outro',
      jobCity: job?.city ?? 'Detalhes indisponíveis',
      jobStatus: job?.status ?? 'unavailable',
      workerName: '',
      workerCity: '',
      amount: Number(proposal.amount),
      platformFee: Number(proposal.platform_fee),
      customerTotal: Number(proposal.customer_total),
      message: proposal.message,
      status: proposal.status,
      createdAt: proposal.created_at,
    };
  });
}

export async function getClientJobsWithProposals(userId: string): Promise<ClientJob[]> {
  const { data: jobs, error: jobsError } = await supabase.from('job_requests')
    .select('id, category_id, description, city, status, created_at')
    .eq('client_id', userId)
    .order('created_at', { ascending: false });
  if (jobsError) throw jobsError;
  if (!jobs?.length) return [];

  const jobIds = jobs.map((job) => job.id);
  const { data: proposals, error: proposalsError } = await supabase.from('job_proposals')
    .select('id, job_id, worker_id, amount, platform_fee, customer_total, message, status, created_at')
    .in('job_id', jobIds)
    .order('created_at', { ascending: false });
  if (proposalsError) throw proposalsError;

  const { data: activePayments, error: paymentsError } = await supabase.from('job_payments')
    .select('job_id, proposal_id, status')
    .in('job_id', jobIds)
    .in('status', ['creating', 'pending']);
  if (paymentsError) throw paymentsError;

  const workerIds = [...new Set((proposals ?? []).map((proposal) => proposal.worker_id))];
  const { data: workers, error: workersError } = workerIds.length
    ? await supabase.from('profiles').select('id, public_name, city').in('id', workerIds)
    : { data: [], error: null };
  if (workersError) throw workersError;

  const workerById = new Map((workers ?? []).map((worker) => [worker.id, worker]));
  const categoryById = new Map(Object.entries(categoryIds).map(([name, id]) => [id, name]));
  return jobs.map((job) => ({
    id: job.id,
    title: job.description.split(/[.!?\n]/)[0].slice(0, 100) || 'Pedido de orçamento',
    category: categoryById.get(job.category_id) ?? 'Outro',
    city: job.city,
    status: job.status,
    createdAt: job.created_at,
    paymentProposalId: activePayments?.find((payment) => payment.job_id === job.id)?.proposal_id ?? null,
    proposals: (proposals ?? []).filter((proposal) => proposal.job_id === job.id).map((proposal) => {
      const worker = workerById.get(proposal.worker_id);
      return {
        id: proposal.id,
        workerName: worker?.public_name ?? 'Profissional verificado',
        workerCity: worker?.city ?? 'RS',
        amount: Number(proposal.amount),
        platformFee: Number(proposal.platform_fee),
        customerTotal: Number(proposal.customer_total),
        message: proposal.message,
        status: proposal.status,
        createdAt: proposal.created_at,
      };
    }),
  }));
}

export type ProfessionalProfile = {
  city: string;
  canWork: boolean;
  verificationStatus: 'not_submitted' | 'pending' | 'verified' | 'rejected';
  services: { id: string; category: string; title: string; city: string; startingPrice: number | null; priceUnit: string }[];
};

export async function getProfessionalProfile(userId: string): Promise<ProfessionalProfile> {
  const [profileResult, servicesResult] = await Promise.all([
    supabase.from('profiles').select('city, can_work, verification_status').eq('id', userId).single(),
    supabase.from('worker_services').select('id, category_id, title, city, starting_price, price_unit').eq('worker_id', userId).order('created_at', { ascending: false }),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (servicesResult.error) throw servicesResult.error;
  const namesById = new Map(Object.entries(categoryIds).map(([name, id]) => [id, name]));
  return {
    city: profileResult.data.city ?? '',
    canWork: profileResult.data.can_work,
    verificationStatus: profileResult.data.verification_status,
    services: (servicesResult.data ?? []).map((service) => ({
      id: service.id,
      category: namesById.get(service.category_id) ?? 'Outro',
      title: service.title,
      city: service.city,
      startingPrice: service.starting_price === null ? null : Number(service.starting_price),
      priceUnit: service.price_unit,
    })),
  };
}

export async function activateProfessionalProfile(input: {
  userId: string;
  city: string;
  category: string;
  title: string;
  description: string;
  startingPrice: number | null;
  priceUnit: 'quote' | 'hour' | 'job' | 'day';
}) {
  const categoryId = categoryIds[input.category];
  if (!categoryId) throw new Error('Escolha uma categoria válida.');

  const { error: profileError } = await supabase.from('profiles').update({ can_work: true, city: input.city, state_code: 'RS' }).eq('id', input.userId);
  if (profileError) throw profileError;

  const { error: serviceError } = await supabase.from('worker_services').insert({
    worker_id: input.userId,
    category_id: categoryId,
    title: input.title,
    description: input.description,
    city: input.city,
    state_code: 'RS',
    starting_price: input.startingPrice,
    price_unit: input.priceUnit,
    active: true,
  });
  if (serviceError) throw serviceError;
}

export type VerificationDocumentType = 'identity_front' | 'identity_back';
export type WorkerVerificationDocument = { id: string; documentType: VerificationDocumentType; createdAt: string };

export async function getWorkerVerificationDocuments(userId: string): Promise<WorkerVerificationDocument[]> {
  const { data, error } = await supabase.from('worker_verification_documents')
    .select('id, document_type, created_at')
    .eq('worker_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((item) => ({
    id: item.id,
    documentType: item.document_type as VerificationDocumentType,
    createdAt: item.created_at,
  }));
}

export async function uploadWorkerVerificationDocument(input: {
  userId: string;
  documentType: VerificationDocumentType;
  uri: string;
  mimeType?: string | null;
}) {
  const response = await fetch(input.uri);
  if (!response.ok) throw new Error('Não foi possível abrir a imagem selecionada.');
  const blob = await response.blob();
  const contentType = input.mimeType || blob.type || 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
    throw new Error('Envie uma foto em JPG, PNG ou WebP.');
  }
  if (blob.size > 8 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 8 MB.');

  const { data: previous, error: previousError } = await supabase.from('worker_verification_documents')
    .select('storage_path').eq('worker_id', input.userId).eq('document_type', input.documentType).maybeSingle();
  if (previousError) throw previousError;
  if (previous?.storage_path) {
    const { error: removeFileError } = await supabase.storage.from('worker-verification').remove([previous.storage_path]);
    if (removeFileError) throw removeFileError;
    const { error: removeRowError } = await supabase.from('worker_verification_documents')
      .delete().eq('worker_id', input.userId).eq('document_type', input.documentType);
    if (removeRowError) throw removeRowError;
  }

  const suffix = Math.random().toString(36).slice(2, 10);
  const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${input.userId}/${input.documentType}-${Date.now()}-${suffix}.${extension}`;
  const { data: document, error: rowError } = await supabase.from('worker_verification_documents').insert({
    worker_id: input.userId,
    document_type: input.documentType,
    storage_path: path,
  }).select('id').single();
  if (rowError) throw rowError;

  const { error: uploadError } = await supabase.storage.from('worker-verification').upload(path, blob, {
    contentType,
    upsert: false,
  });
  if (uploadError) {
    await supabase.from('worker_verification_documents').delete().eq('id', document.id);
    throw uploadError;
  }
}

export async function submitWorkerVerification() {
  const { error } = await supabase.rpc('submit_worker_verification');
  if (error) throw error;
}

export type ReviewerRole = 'owner' | 'verifier' | 'support';
export type VerificationQueueEntry = {
  workerId: string;
  name: string;
  city: string;
  submittedAt: string;
  frontUrl: string | null;
  backUrl: string | null;
};

export async function getReviewerRole(userId: string): Promise<ReviewerRole | null> {
  const { data, error } = await supabase.from('staff_members').select('role').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return (data?.role as ReviewerRole | undefined) ?? null;
}

export async function getVerificationReviewQueue(userId: string) {
  const role = await getReviewerRole(userId);
  if (role !== 'owner' && role !== 'verifier') throw new Error('Somente revisores autorizados podem acessar esta fila.');

  const { data: workers, error: workersError } = await supabase.from('profiles')
    .select('id, public_name, city, updated_at')
    .eq('can_work', true)
    .eq('verification_status', 'pending')
    .order('updated_at', { ascending: true });
  if (workersError) throw workersError;
  if (!workers?.length) return { role, entries: [] as VerificationQueueEntry[] };

  const workerIds = workers.map((worker) => worker.id);
  const { data: documents, error: documentsError } = await supabase.from('worker_verification_documents')
    .select('worker_id, document_type, storage_path, created_at')
    .in('worker_id', workerIds);
  if (documentsError) throw documentsError;

  const entries = await Promise.all(workers.map(async (worker) => {
    const files = (documents ?? []).filter((document) => document.worker_id === worker.id);
    const frontPath = files.find((document) => document.document_type === 'identity_front')?.storage_path;
    const backPath = files.find((document) => document.document_type === 'identity_back')?.storage_path;
    const [frontResult, backResult] = await Promise.all([
      frontPath ? supabase.storage.from('worker-verification').createSignedUrl(frontPath, 60) : Promise.resolve({ data: null, error: null }),
      backPath ? supabase.storage.from('worker-verification').createSignedUrl(backPath, 60) : Promise.resolve({ data: null, error: null }),
    ]);
    if (frontResult.error) throw frontResult.error;
    if (backResult.error) throw backResult.error;
    return {
      workerId: worker.id,
      name: worker.public_name,
      city: worker.city ?? 'Cidade não informada',
      submittedAt: worker.updated_at,
      frontUrl: frontResult.data?.signedUrl ?? null,
      backUrl: backResult.data?.signedUrl ?? null,
    };
  }));
  return { role, entries };
}

export async function reviewWorkerVerification(workerId: string, status: 'verified' | 'rejected') {
  const { error } = await supabase.rpc('review_worker_verification', { p_worker_id: workerId, p_status: status });
  if (error) throw error;
}
