import { useCallback, useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/BrandHeader';
import { Page } from '@/components/Page';
import { brand } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { getVerificationReviewQueue, reviewWorkerVerification, type VerificationQueueEntry } from '@/lib/marketplace';

export default function ReviewScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [entries, setEntries] = useState<VerificationQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyWorker, setBusyWorker] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadQueue = useCallback(async () => {
    if (!user) return;
    const result = await getVerificationReviewQueue(user.id);
    setRole(result.role);
    setEntries(result.entries);
  }, [user]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(loadQueue).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar a fila.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [loadQueue]);

  async function decide(workerId: string, status: 'verified' | 'rejected') {
    setBusyWorker(workerId);
    setError('');
    setNotice('');
    try {
      await reviewWorkerVerification(workerId, status);
      setNotice(status === 'verified' ? 'Identidade aprovada.' : 'Verificação reprovada; o profissional poderá substituir as imagens.');
      await loadQueue();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Não foi possível atualizar a verificação.');
    } finally {
      setBusyWorker(null);
    }
  }

  return (
    <View style={styles.screen}>
      <BrandHeader mode="work" />
      <Page>
        <Text style={styles.eyebrow}>PAINEL DA EQUIPE</Text>
        <Text style={styles.title}>Revisão de identidade</Text>
        <Text style={styles.subtitle}>Acesse somente para conferir os documentos e registrar a análise.</Text>

        {!user ? <View style={styles.info}><Text style={styles.infoTitle}>Entre com a conta de revisor</Text><Text style={styles.body}>O acesso é limitado aos usuários adicionados à equipe do CONTRATEI.</Text></View> : loading ? <Text style={styles.body}>Carregando fila…</Text> : error && !role ? <View style={styles.info}><Text style={styles.infoTitle}>Acesso restrito</Text><Text style={styles.body}>Esta conta não está cadastrada como revisora. Um administrador precisa adicionar seu usuário à equipe.</Text></View> : (
          <>
            <View style={styles.queueHeader}>
              <View><Text style={styles.queueCount}>{entries.length}</Text><Text style={styles.queueLabel}>aguardando análise</Text></View>
              <Pressable onPress={() => { setLoading(true); setError(''); void loadQueue().catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Falha ao atualizar a fila.')).finally(() => setLoading(false)); }} style={styles.refreshButton}><Text style={styles.refreshText}>Atualizar fila</Text></Pressable>
            </View>
            {entries.map((entry) => <View key={entry.workerId} style={styles.card}>
              <View style={styles.workerHeading}>
                <View style={{ flex: 1 }}><Text style={styles.workerName}>{entry.name}</Text><Text style={styles.workerMeta}>{entry.city}, RS · enviado {new Date(entry.submittedAt).toLocaleDateString('pt-BR')}</Text></View>
                <Text style={styles.pendingBadge}>PENDENTE</Text>
              </View>
              <View style={styles.documents}>
                <DocumentPreview label="Frente" url={entry.frontUrl} />
                <DocumentPreview label="Verso" url={entry.backUrl} />
              </View>
              <Text style={styles.privacy}>Imagens privadas, geradas com link temporário. Evite salvar, compartilhar ou manter cópias fora do sistema.</Text>
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
              <View style={styles.actions}>
                <Pressable disabled={busyWorker === entry.workerId} onPress={() => void decide(entry.workerId, 'rejected')} style={[styles.rejectButton, busyWorker === entry.workerId && styles.disabled]}><Text style={styles.rejectText}>{busyWorker === entry.workerId ? 'Salvando…' : 'Solicitar novas fotos'}</Text></Pressable>
                <Pressable disabled={busyWorker === entry.workerId || !entry.frontUrl || !entry.backUrl} onPress={() => void decide(entry.workerId, 'verified')} style={[styles.approveButton, (busyWorker === entry.workerId || !entry.frontUrl || !entry.backUrl) && styles.disabled]}><Text style={styles.approveText}>{busyWorker === entry.workerId ? 'Salvando…' : 'Aprovar identidade'}</Text></Pressable>
              </View>
            </View>)}
            {!entries.length && !loading ? <View style={styles.info}><Text style={styles.infoTitle}>Fila vazia</Text><Text style={styles.body}>Quando alguém solicitar a verificação, o pedido aparecerá aqui.</Text></View> : null}
          </>
        )}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error && role ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </Page>
    </View>
  );
}

function DocumentPreview({ label, url }: { label: string; url: string | null }) {
  return <View style={styles.preview}>
    <Text style={styles.previewLabel}>{label} do documento</Text>
    {url ? <Image source={{ uri: url }} contentFit="contain" style={styles.image} /> : <View style={[styles.image, styles.imageMissing]}><Text style={styles.body}>Imagem indisponível</Text></View>}
  </View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: brand.background, flex: 1 },
  eyebrow: { color: brand.orangeDark, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 30 },
  title: { color: brand.ink, fontSize: 34, fontWeight: '900', letterSpacing: -1.2, marginTop: 8 },
  subtitle: { color: brand.muted, fontSize: 13, lineHeight: 20, marginTop: 6, maxWidth: 760 },
  queueHeader: { alignItems: 'center', backgroundColor: '#fff', borderColor: brand.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, maxWidth: 960, padding: 15 },
  queueCount: { color: brand.ink, fontSize: 24, fontWeight: '900' },
  queueLabel: { color: brand.muted, fontSize: 10 },
  refreshButton: { backgroundColor: brand.orangeSoft, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9 },
  refreshText: { color: brand.orangeDark, fontSize: 10, fontWeight: '800' },
  card: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 16, borderWidth: 1, marginTop: 13, maxWidth: 960, padding: 15 },
  workerHeading: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  workerName: { color: brand.ink, fontSize: 14, fontWeight: '900' },
  workerMeta: { color: brand.muted, fontSize: 10, marginTop: 4 },
  pendingBadge: { backgroundColor: '#FFF2D7', borderRadius: 20, color: '#865B00', fontSize: 8, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 6 },
  documents: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  preview: { flex: 1, minWidth: 230 },
  previewLabel: { color: brand.ink, fontSize: 10, fontWeight: '800', marginBottom: 7 },
  image: { backgroundColor: '#F4F5F4', borderRadius: 10, height: 220, width: '100%' },
  imageMissing: { alignItems: 'center', justifyContent: 'center' },
  privacy: { color: brand.muted, fontSize: 9, lineHeight: 14, marginTop: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', marginTop: 14 },
  rejectButton: { alignItems: 'center', backgroundColor: '#FFF0EB', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10 },
  rejectText: { color: '#A23B27', fontSize: 10, fontWeight: '800' },
  approveButton: { alignItems: 'center', backgroundColor: brand.success, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10 },
  approveText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  info: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 14, borderWidth: 1, marginTop: 18, maxWidth: 700, padding: 15 },
  infoTitle: { color: brand.ink, fontSize: 13, fontWeight: '900' },
  body: { color: brand.muted, fontSize: 10, lineHeight: 16, marginTop: 5 },
  notice: { color: brand.success, fontSize: 11, fontWeight: '700', marginTop: 12 },
  error: { color: '#B42318', fontSize: 10, fontWeight: '700', marginTop: 10 },
});
