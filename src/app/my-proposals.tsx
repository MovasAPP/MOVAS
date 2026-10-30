import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthModal } from '@/components/AuthModal';
import { BrandHeader } from '@/components/BrandHeader';
import { Page } from '@/components/Page';
import { SectionTitle } from '@/components/SectionTitle';
import { brand } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { getWorkerProposals, requestJobCompletion, withdrawProposal, type WorkerProposal } from '@/lib/marketplace';

const proposalLabel: Record<WorkerProposal['status'], string> = {
  pending: 'Aguardando resposta',
  accepted: 'Aceita',
  rejected: 'Não selecionada',
  withdrawn: 'Retirada',
};

const jobLabel: Record<WorkerProposal['jobStatus'], string> = {
  open: 'Pedido aberto',
  awaiting_payment: 'Aguardando pagamento do contratante',
  in_progress: 'Trabalho em andamento',
  completion_pending: 'Aguardando confirmação do contratante',
  completed: 'Trabalho concluído',
  cancelled: 'Pedido cancelado',
  unavailable: 'Pedido indisponível',
};

export default function MyProposalsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [proposals, setProposals] = useState<WorkerProposal[] | null>(null);
  const [error, setError] = useState('');
  const [busyProposal, setBusyProposal] = useState<string | null>(null);
  const [busyCompletion, setBusyCompletion] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) return () => { active = false; };
    void getWorkerProposals(user.id).then((items) => {
      if (active) setProposals(items);
    }).catch((loadError: unknown) => {
      if (active) {
        setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar suas propostas.');
        setProposals([]);
      }
    });
    return () => { active = false; };
  }, [user]);

  async function withdraw(id: string) {
    if (!user || busyProposal) return;
    setBusyProposal(id);
    setError('');
    try {
      await withdrawProposal(id, user.id);
      setProposals((current) => current?.map((proposal) => proposal.id === id ? { ...proposal, status: 'withdrawn' } : proposal) ?? []);
    } catch (withdrawError) {
      setError(withdrawError instanceof Error ? withdrawError.message : 'Não foi possível retirar a proposta.');
    } finally {
      setBusyProposal(null);
    }
  }

  async function markComplete(jobId: string) {
    if (busyCompletion) return;
    setBusyCompletion(jobId);
    setError('');
    try {
      await requestJobCompletion(jobId);
      setProposals((current) => current?.map((proposal) => proposal.jobId === jobId ? { ...proposal, jobStatus: 'completion_pending' } : proposal) ?? []);
    } catch (completionError) {
      setError(completionError instanceof Error ? completionError.message : 'Não foi possível solicitar a confirmação de conclusão.');
    } finally {
      setBusyCompletion(null);
    }
  }

  return (
    <View style={styles.screen}>
      <BrandHeader mode="work" />
      <Page>
        <Text style={styles.eyebrow}>MODO PROFISSIONAL</Text>
        <Text style={styles.title}>Minhas propostas</Text>
        <Text style={styles.subtitle}>Acompanhe as respostas dos contratantes e os valores enviados.</Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {!user ? (
          <Pressable onPress={() => setAuthOpen(true)} style={styles.emptyCard}><Text style={styles.cardTitle}>Entre para acompanhar suas propostas</Text><Text style={styles.action}>Entrar →</Text></Pressable>
        ) : proposals === null ? (
          <Text style={styles.loading}>Carregando propostas…</Text>
        ) : proposals.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.cardTitle}>Você ainda não enviou propostas</Text><Text style={styles.body}>Encontre pedidos abertos e envie uma proposta para começar.</Text><Pressable onPress={() => router.push('/work')} style={styles.actionButton}><Text style={styles.actionButtonText}>Ver oportunidades</Text></Pressable></View>
        ) : (
          <>
            <SectionTitle title={`${proposals.length} ${proposals.length === 1 ? 'proposta enviada' : 'propostas enviadas'}`} subtitle="O cliente paga a taxa MOVA$ de 10%; a tarifa do Mercado Pago é descontada do seu recebimento." />
            <View style={styles.list}>
              {proposals.map((proposal) => (
                <View key={proposal.id} style={styles.card}>
                  <View style={styles.heading}>
                    <View style={{ flex: 1 }}><Text style={styles.category}>{proposal.category.toUpperCase()} · {proposal.jobCity}</Text><Text style={styles.cardTitle}>{proposal.jobTitle}</Text></View>
                    <Text style={[styles.status, proposal.status === 'accepted' && styles.statusAccepted]}>{proposalLabel[proposal.status]}</Text>
                  </View>
                  <Text style={styles.jobStatus}>{jobLabel[proposal.jobStatus]}</Text>
                  <Text style={styles.message}>{proposal.message}</Text>
                  <View style={styles.footer}>
                    <View><Text style={styles.meta}>Valor do serviço (antes da tarifa MP)</Text><Text style={styles.amount}>{money(proposal.amount)}</Text></View>
                    <View style={styles.totalBox}><Text style={styles.totalLabel}>Total para o cliente*</Text><Text style={styles.total}>{money(proposal.customerTotal)}</Text></View>
                  </View>
                  <Text style={styles.date}>Enviada em {new Date(proposal.createdAt).toLocaleDateString('pt-BR')}</Text>
                  {proposal.status === 'pending' && proposal.jobStatus === 'open' ? <Pressable disabled={busyProposal === proposal.id} onPress={() => void withdraw(proposal.id)} style={styles.withdrawButton}><Text style={styles.withdrawText}>{busyProposal === proposal.id ? 'Retirando…' : 'Retirar proposta'}</Text></Pressable> : null}
                  {proposal.status === 'accepted' && ['in_progress', 'completion_pending', 'completed'].includes(proposal.jobStatus) ? <View style={styles.jobActions}>
                    <Pressable onPress={() => router.push({ pathname: '/chat', params: { jobId: proposal.jobId } })} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Abrir conversa</Text></Pressable>
                    {proposal.jobStatus === 'in_progress' ? <Pressable disabled={busyCompletion === proposal.jobId} onPress={() => void markComplete(proposal.jobId)} style={styles.completeButton}><Text style={styles.completeButtonText}>{busyCompletion === proposal.jobId ? 'Enviando…' : 'Marcar como concluído'}</Text></Pressable> : null}
                    {proposal.jobStatus === 'completion_pending' ? <Text style={styles.pendingCompletion}>Aguardando o contratante confirmar.</Text> : null}
                    {proposal.jobStatus === 'completed' ? <Pressable onPress={() => router.push({ pathname: '/review-job', params: { jobId: proposal.jobId } })} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Avaliar contratante</Text></Pressable> : null}
                  </View> : null}
                </View>
              ))}
            </View>
          </>
        )}
        <Text style={styles.disclaimer}>*Total inclui 10% de taxa MOVA$, paga pelo cliente. A tarifa de processamento varia conforme o meio de pagamento e será descontada do recebimento do profissional. Consulte o valor final no detalhamento da venda do Mercado Pago.</Text>
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
  loading: { color: brand.muted, fontSize: 12, marginTop: 24 },
  error: { color: '#B42318', fontSize: 11, marginTop: 16 },
  emptyCard: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 15, borderWidth: 1, marginTop: 22, maxWidth: 700, padding: 17 },
  cardTitle: { color: brand.ink, fontSize: 14, fontWeight: '900', marginTop: 5 },
  body: { color: brand.muted, fontSize: 10, lineHeight: 16, marginTop: 6 },
  action: { color: brand.orangeDark, fontSize: 11, fontWeight: '900', marginTop: 14 },
  actionButton: { alignSelf: 'flex-start', backgroundColor: brand.orangeDark, borderRadius: 9, marginTop: 14, paddingHorizontal: 12, paddingVertical: 9 },
  actionButtonText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  list: { gap: 12 },
  card: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 15, borderWidth: 1, maxWidth: 820, padding: 14 },
  heading: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  category: { color: brand.orangeDark, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  status: { backgroundColor: '#F1F3F2', borderRadius: 99, color: brand.muted, fontSize: 8, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5 },
  statusAccepted: { backgroundColor: brand.successSoft, color: brand.success },
  jobStatus: { color: brand.muted, fontSize: 9, marginTop: 6 },
  message: { color: '#46545E', fontSize: 10, lineHeight: 16, marginTop: 12 },
  footer: { alignItems: 'center', borderTopColor: brand.border, borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between', marginTop: 12, paddingTop: 10 },
  meta: { color: brand.muted, fontSize: 8 },
  amount: { color: brand.ink, fontSize: 15, fontWeight: '900', marginTop: 3 },
  totalBox: { backgroundColor: brand.orangeSoft, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7 },
  totalLabel: { color: brand.orangeDark, fontSize: 8, fontWeight: '700' },
  total: { color: brand.orangeDark, fontSize: 13, fontWeight: '900', marginTop: 2 },
  date: { color: brand.muted, fontSize: 8, marginTop: 9 },
  withdrawButton: { alignSelf: 'flex-start', borderColor: brand.border, borderRadius: 8, borderWidth: 1, marginTop: 10, paddingHorizontal: 10, paddingVertical: 7 },
  withdrawText: { color: brand.muted, fontSize: 9, fontWeight: '800' },
  jobActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  secondaryButton: { backgroundColor: '#F4F1ED', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  secondaryButtonText: { color: brand.orangeDark, fontSize: 9, fontWeight: '900' },
  completeButton: { backgroundColor: brand.orangeDark, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  completeButtonText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  pendingCompletion: { alignSelf: 'center', color: brand.muted, fontSize: 9 },
  disclaimer: { color: brand.muted, fontSize: 9, lineHeight: 14, marginBottom: 15, marginTop: 18, maxWidth: 700 },
});
