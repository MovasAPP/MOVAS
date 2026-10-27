import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { AuthModal } from '@/components/AuthModal';
import { BrandHeader } from '@/components/BrandHeader';
import { Page } from '@/components/Page';
import { brand } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { getJobDispute, openJobDispute, type JobDispute } from '@/lib/marketplace';

const reasons = [
  ['service_quality', 'Qualidade do serviço'],
  ['not_completed', 'Serviço não concluído'],
  ['payment', 'Pagamento'],
  ['safety', 'Segurança'],
  ['other', 'Outro'],
] as const;

export default function DisputeScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [dispute, setDispute] = useState<JobDispute | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [reason, setReason] = useState<string>('other');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!jobId || !user) return;
    setLoaded(false);
    try {
      setDispute(await getJobDispute(jobId));
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível consultar o suporte.');
    } finally {
      setLoaded(true);
    }
  }, [jobId, user]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  async function submit() {
    if (!jobId || busy) return;
    setBusy(true);
    setError('');
    try {
      await openJobDispute(jobId, reason, details);
      await refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível enviar sua solicitação.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <BrandHeader mode="hire" />
      <Page>
        <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹ Voltar</Text></Pressable>
        <Text style={styles.eyebrow}>SUPORTE DA CONTRATAÇÃO</Text>
        <Text style={styles.title}>Precisa de ajuda?</Text>
        <Text style={styles.subtitle}>Descreva o que aconteceu. A solicitação fica visível somente para as partes e para a equipe de suporte.</Text>
        {!user ? <Pressable onPress={() => setAuthOpen(true)} style={styles.card}><Text style={styles.subtitle}>Entre na sua conta para solicitar suporte.</Text></Pressable> : !loaded ? <Text style={styles.subtitle}>Carregando…</Text> : dispute ? (
          <View style={styles.card}>
            <Text style={styles.status}>Status: {dispute.status === 'open' ? 'Em análise' : dispute.status === 'resolved' ? 'Respondida' : 'Encerrada'}</Text>
            <Text style={styles.label}>Relato enviado</Text><Text style={styles.body}>{dispute.details}</Text>
            {dispute.resolution ? <><Text style={styles.label}>Resposta do suporte</Text><Text style={styles.body}>{dispute.resolution}</Text></> : null}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>Motivo</Text>
            <View style={styles.reasonList}>{reasons.map(([value, label]) => <Pressable key={value} onPress={() => setReason(value)} style={[styles.reason, reason === value && styles.reasonSelected]}><Text style={[styles.reasonText, reason === value && styles.reasonTextSelected]}>{label}</Text></Pressable>)}</View>
            <Text style={styles.label}>O que aconteceu? (mínimo de 10 caracteres)</Text>
            <TextInput maxLength={3000} multiline onChangeText={setDetails} placeholder="Explique a situação com clareza…" placeholderTextColor="#87938E" style={styles.input} value={details} />
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <Pressable disabled={busy || details.trim().length < 10} onPress={() => void submit()} style={[styles.submit, (busy || details.trim().length < 10) && { opacity: 0.55 }]}><Text style={styles.submitText}>{busy ? 'Enviando…' : 'Enviar para o suporte'}</Text></Pressable>
          </View>
        )}
      </Page>
      <AuthModal visible={authOpen} onClose={() => setAuthOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: brand.background, flex: 1 },
  back: { alignSelf: 'flex-start', marginTop: 17, paddingVertical: 6 },
  backText: { color: brand.orangeDark, fontSize: 12, fontWeight: '800' },
  eyebrow: { color: brand.orangeDark, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 14 },
  title: { color: brand.ink, fontSize: 28, fontWeight: '900', marginTop: 8 },
  subtitle: { color: brand.muted, fontSize: 12, lineHeight: 18, marginTop: 6, maxWidth: 700 },
  error: { color: '#B42318', fontSize: 10, marginTop: 11 },
  card: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 15, borderWidth: 1, marginTop: 20, maxWidth: 700, padding: 16 },
  label: { color: brand.ink, fontSize: 10, fontWeight: '900', marginTop: 12 },
  reasonList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  reason: { backgroundColor: '#F3F5F3', borderColor: brand.border, borderRadius: 99, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  reasonSelected: { backgroundColor: brand.orangeSoft, borderColor: brand.orange },
  reasonText: { color: brand.muted, fontSize: 9, fontWeight: '700' },
  reasonTextSelected: { color: brand.orangeDark },
  input: { backgroundColor: '#F7F8F7', borderColor: brand.border, borderRadius: 9, borderWidth: 1, color: brand.ink, fontSize: 11, marginTop: 7, minHeight: 125, padding: 10, textAlignVertical: 'top' },
  submit: { alignSelf: 'flex-start', backgroundColor: brand.orange, borderRadius: 9, marginTop: 13, paddingHorizontal: 13, paddingVertical: 10 },
  submitText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  status: { color: brand.orangeDark, fontSize: 11, fontWeight: '900' },
  body: { color: brand.ink, fontSize: 11, lineHeight: 18, marginTop: 6 },
});
