import { supabase } from '@/lib/supabase';
import type { QuoteRequest } from '@/components/QuoteRequestModal';
import type { Job } from '@/components/JobCard';
import { categories } from '@/constants/brand';

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
  const dateMatch = request.date.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const preferredDate = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null;
  const amountText = request.budget.trim().replace(/[^\d,.-]/g, '').replace(',', '.');
  const budget = amountText ? Number(amountText) : null;
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
};

export async function getVerifiedWorkerServices(): Promise<VerifiedServiceCard[]> {
  const { data: services, error: servicesError } = await supabase.from('worker_services')
    .select('id, worker_id, category_id, title, city, starting_price, price_unit')
    .eq('active', true)
    .eq('state_code', 'RS')
    .order('created_at', { ascending: false })
    .limit(60);
  if (servicesError) throw servicesError;
  if (!services?.length) return [];

  const workerIds = [...new Set(services.map((service) => service.worker_id))];
  const { data: profiles, error: profilesError } = await supabase.from('profiles')
    .select('id, public_name, city')
    .in('id', workerIds);
  if (profilesError) throw profilesError;

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const categoryById = new Map(Object.entries(categoryIds).map(([name, id]) => [id, name]));
  const categoryMetaByName = new Map(categories.map((category) => [category.name, category]));
  const priceUnitLabel: Record<string, string> = {
    quote: 'Orçamento personalizado',
    hour: 'Valor por hora',
    job: 'Valor por serviço',
    day: 'Valor por diária',
  };

  return services.flatMap((service) => {
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
      icon: categoryMeta?.icon ?? '✦',
      color: categoryMeta?.color ?? '#E8C6A7',
      priceLabel: startingPrice === null
        ? priceUnitLabel[service.price_unit] ?? 'Orçamento personalizado'
        : `A partir de ${startingPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
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
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  proposals: ClientProposal[];
};

export type WorkerProposal = ClientProposal & {
  jobId: string;
  jobTitle: string;
  category: string;
  jobCity: string;
  jobStatus: 'open' | 'in_progress' | 'completed' | 'cancelled' | 'unavailable';
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
