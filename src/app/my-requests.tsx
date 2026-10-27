import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { BrandHeader } from '@/components/BrandHeader';
import { Page } from '@/components/Page';
import { AuthModal } from '@/components/AuthModal';
import { SectionTitle } from '@/components/SectionTitle';
import { brand } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { cancelOpenJobRequest, createMercadoPagoCheckout, getClientJobsWithProposals, type ClientJob } from '@/lib/marketplace';

const jobStatusLabel: Record<ClientJob['status'], string> = {
  open: 'Recebendo propostas',
  awaiting_payment: 'Aguardando pagamento',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const proposalStatusLabel = {
  pending: 'Nova proposta',
  accepted: 'Aceita',
  rejected: 'Recusada',
  withdrawn: 'Retirada',
} as const;

export default function MyRequestsScreen() {
  const { payment } = useLocalSearchParams<{ payment?: string }>();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [jobs, setJobs] = useState<ClientJob[] | null>(null);
  const [error, setError] = useState('');
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [busyCancelId, setBusyCancelId] = useState<string | null>(null);
  const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);

  const refreshJobs = useCallback(() => {
    let active = true;
    setError('');
    if (!user) {
      return () => { active = false; };
    }
    void getClientJobsWithProposals(user.id).then((nextJobs) => {
      if (active) setJobs(nextJobs);
    }).catch((loadError: unknown) => {
      if (active) {
        setJobs([]);
        setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar seus pedidos.');
      }
    });
    return () => { active = false; };
  }, [user]);

  useFocusEffect(useCallback(() => refreshJobs(), [refreshJobs]));

  async function payProposal(proposalId: string) {
    if (busyPaymentId) return;
    setBusyPaymentId(proposalId);
    setError('');
    try {
      const checkoutUrl = await createMercadoPagoCheckout(proposalId);
      if (Platform.OS === 'web') window.location.assign(checkoutUrl);
      else await WebBrowser.openBrowserAsync(checkoutUrl);
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Não foi possível iniciar o checkout.');
    } finally {
      setBusyPaymentId(null);
    }
  }

  async function cancelJob(jobId: string) {
    if (busyCancelId) return;
    setBusyCancelId(jobId);
    setError('');
    try {
      await cancelOpenJobRequest(jobId);
      setJobs((current) => current?.map((job) => job.id === jobId ? { ...job, status: 'cancelled' } : job) ?? []);
      setConfirmCancelId(null);
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'Não foi possível cancelar o pedido.');
    } finally {
      setBusyCancelId(null);
    }
  }

  return (
    <View style={styles.screen}>
      <BrandHeader mode="hire" />
      <Page>
        <Text style={styles.eyebrow}>ÁREA DO CONTRATANTE</Text>
        <Text style={styles.title}>Meus pedidos</Text>
        <Text style={styles.subtitle}>Acompanhe cada pedido e compare as propostas recebidas.</Text>
        {payment === 'success' ? <Text style={styles.paymentNotice}>Pagamento enviado ao Mercado Pago. A contratação será confirmada aqui após a confirmação segura do pagamento.</Text> : null}
        {payment === 'pending' ? <Text style={styles.paymentNotice}>Pagamento pendente. Estamos aguardando a confirmação do Mercado Pago.</Text> : null}
        {payment === 'failure' ? <Text style={styles.paymentError}>O pagamento não foi concluído. Nenhuma contratação foi confirmada; você pode tentar novamente.</Text> : null}
        {!user ? (
          <Pressable onPress={() => setAuthOpen(true)} style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Entre para ver seus pedidos</Text>
            <Text style={styles.emptyText}>Seus pedidos e as respostas dos profissionais aparecem aqui.</Text>
            <Text style={styles.actionText}>Entrar →</Text>
          </Pressable>
        ) : jobs === null ? (
          <Text style={styles.loading}>Carregando seus pedidos…</Text>
        ) : error ? (
          <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
        ) : jobs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Você ainda não publicou um pedido</Text>
            <Text style={styles.emptyText}>Quando solicitar um orçamento, poderá acompanhar as respostas nesta área.</Text>
          </View>
        ) : (
          <>
            <SectionTitle title={`${jobs.length} ${jobs.length === 1 ? 'pedido' : 'pedidos'}`} subtitle="As propostas são atualizadas a partir do Supabase." />
            <View style={styles.jobList}>
              {jobs.map((job) => (
                <View key={job.id} style={styles.jobCard}>
                  <View style={styles.jobHeading}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.category}>{job.category.toUpperCase()} · {job.city}</Text>
                      <Text style={styles.jobTitle}>{job.title}</Text>
                    </View>
                    <Text style={styles.jobStatus}>{jobStatusLabel[job.status]}</Text>
                  </View>
                  <View style={styles.proposalHeading}>
                    <Text style={styles.proposalCount}>{job.proposals.length} {job.proposals.length === 1 ? 'proposta recebida' : 'propostas recebidas'}</Text>
                    <Text style={styles.proposalHint}>Publicado em {new Date(`${job.createdAt}`).toLocaleDateString('pt-BR')}</Text>
                  </View>
                  {job.proposals.length ? job.proposals.map((proposal) => (
                    <View key={proposal.id} style={styles.proposalCard}>
                      <View style={styles.workerHeading}>
                        <View style={styles.avatar}><Text style={styles.avatarText}>{proposal.workerName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</Text></View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.workerName}>{proposal.workerName}</Text>
                          <Text style={styles.workerCity}>{proposal.workerCity}, RS</Text>
                        </View>
                        <Text style={[styles.proposalStatus, proposal.status === 'accepted' && styles.acceptedStatus]}>{proposalStatusLabel[proposal.status]}</Text>
                      </View>
                      <Text style={styles.message}>{proposal.message}</Text>
                      <View style={styles.priceRow}>
                        <View><Text style={styles.priceLabel}>Valor do profissional</Text><Text style={styles.price}>{money(proposal.amount)}</Text></View>
                        <View style={styles.totalBox}><Text style={styles.totalLabel}>Total com taxa CONTRATEI (10%)</Text><Text style={styles.total}>{money(proposal.customerTotal)}</Text></View>
                      </View>
                      <Text style={styles.processingFeeNote}>A tarifa de processamento do Mercado Pago será descontada do recebimento do profissional.</Text>
                      {job.status === 'open' && proposal.status === 'pending' ? (
                        <Pressable disabled={busyPaymentId !== null} onPress={() => void payProposal(proposal.id)} style={[styles.payButton, busyPaymentId !== null && { opacity: 0.65 }]}>
                          <Text style={styles.payButtonText}>{busyPaymentId === proposal.id ? 'Preparando pagamento…' : `Contratar e pagar ${money(proposal.customerTotal)}`}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  )) : (
                    <Text style={styles.noProposals}>Assim que um profissional responder, a proposta aparecerá aqui.</Text>
                  )}
                  {job.status === 'open' ? (
                    confirmCancelId === job.id ? (
                      <View style={styles.cancelConfirm}>
                        <Text style={styles.cancelText}>Cancelar este pedido? Os profissionais não poderão mais enviar propostas.</Text>
                        <View style={styles.cancelActions}>
                          <Pressable onPress={() => setConfirmCancelId(null)} style={styles.keepButton}><Text style={styles.keepText}>Manter pedido</Text></Pressable>
                          <Pressable disabled={busyCancelId === job.id} onPress={() => void cancelJob(job.id)} style={styles.cancelButton}><Text style={styles.cancelButtonText}>{busyCancelId === job.id ? 'Cancelando…' : 'Confirmar cancelamento'}</Text></Pressable>
                        </View>
                      </View>
                    ) : <Pressable onPress={() => setConfirmCancelId(job.id)} style={styles.cancelLink}><Text style={styles.cancelLinkText}>Cancelar pedido</Text></Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          </>
        )}
      </Page>
      <AuthModal visible={authOpen} onClose={() => setAuthOpen(false)} />
    </View>
  );
}

function money(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const styles = StyleSheet.create({
  screen: { backgroundColor: brand.background, flex: 1 },
  eyebrow: { color: brand.orangeDark, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 28 },
  title: { color: brand.ink, fontSize: 36, fontWeight: '900', letterSpacing: -1.5, marginTop: 8 },
  subtitle: { color: brand.muted, fontSize: 13, lineHeight: 20, marginTop: 5, maxWidth: 620 },
  paymentNotice: { backgroundColor: '#EAF5EF', borderRadius: 10, color: '#246044', fontSize: 11, lineHeight: 16, marginTop: 15, maxWidth: 860, padding: 11 },
  paymentError: { backgroundColor: '#FFF2EF', borderRadius: 10, color: '#8C3529', fontSize: 11, lineHeight: 16, marginTop: 15, maxWidth: 860, padding: 11 },
  loading: { color: brand.muted, fontSize: 12, marginTop: 24 },
  error: { color: '#B42318', fontSize: 12, marginTop: 22 },
  emptyCard: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 16, borderWidth: 1, marginTop: 24, maxWidth: 700, padding: 18 },
  emptyTitle: { color: brand.ink, fontSize: 15, fontWeight: '900' },
  emptyText: { color: brand.muted, fontSize: 11, lineHeight: 17, marginTop: 6 },
  actionText: { color: brand.orangeDark, fontSize: 11, fontWeight: '900', marginTop: 13 },
  jobList: { gap: 14 },
  jobCard: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 16, borderWidth: 1, maxWidth: 860, padding: 15 },
  jobHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  category: { color: brand.orangeDark, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  jobTitle: { color: brand.ink, fontSize: 16, fontWeight: '900', marginTop: 5 },
  jobStatus: { backgroundColor: brand.successSoft, borderRadius: 99, color: brand.success, fontSize: 9, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 6 },
  proposalHeading: { alignItems: 'center', borderBottomColor: brand.border, borderBottomWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', marginTop: 15, paddingBottom: 10 },
  proposalCount: { color: brand.ink, fontSize: 11, fontWeight: '900' },
  proposalHint: { color: brand.muted, fontSize: 9 },
  proposalCard: { backgroundColor: '#FFFCFA', borderColor: brand.border, borderRadius: 12, borderWidth: 1, marginTop: 10, padding: 12 },
  workerHeading: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  avatar: { alignItems: 'center', backgroundColor: brand.orangeSoft, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  avatarText: { color: brand.orangeDark, fontSize: 10, fontWeight: '900' },
  workerName: { color: brand.ink, fontSize: 11, fontWeight: '900' },
  workerCity: { color: brand.muted, fontSize: 9, marginTop: 3 },
  proposalStatus: { backgroundColor: '#F1F3F2', borderRadius: 99, color: brand.muted, fontSize: 8, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5 },
  acceptedStatus: { backgroundColor: brand.successSoft, color: brand.success },
  message: { color: '#46545E', fontSize: 11, lineHeight: 17, marginTop: 11 },
  priceRow: { alignItems: 'center', borderTopColor: brand.border, borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between', marginTop: 12, paddingTop: 11 },
  priceLabel: { color: brand.muted, fontSize: 8 },
  price: { color: brand.ink, fontSize: 15, fontWeight: '900', marginTop: 3 },
  totalBox: { backgroundColor: brand.orangeSoft, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 },
  totalLabel: { color: brand.orangeDark, fontSize: 8, fontWeight: '700' },
  total: { color: brand.orangeDark, fontSize: 14, fontWeight: '900', marginTop: 3 },
  processingFeeNote: { color: brand.muted, fontSize: 9, lineHeight: 14, marginTop: 8 },
  payButton: { alignSelf: 'flex-start', backgroundColor: brand.orange, borderRadius: 9, marginTop: 12, paddingHorizontal: 13, paddingVertical: 10 },
  payButtonText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  noProposals: { color: brand.muted, fontSize: 10, lineHeight: 16, paddingTop: 11 },
  cancelLink: { alignSelf: 'flex-start', marginTop: 12, paddingVertical: 5 },
  cancelLinkText: { color: '#A23B27', fontSize: 9, fontWeight: '800' },
  cancelConfirm: { backgroundColor: '#FFF5F1', borderRadius: 10, marginTop: 12, padding: 11 },
  cancelText: { color: '#7A3122', fontSize: 9, lineHeight: 14 },
  cancelActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 9 },
  keepButton: { borderColor: brand.border, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  keepText: { color: brand.ink, fontSize: 9, fontWeight: '800' },
  cancelButton: { backgroundColor: '#A23B27', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  cancelButtonText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
