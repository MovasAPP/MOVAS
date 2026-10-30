import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { AuthModal } from '@/components/AuthModal';
import { BrandHeader } from '@/components/BrandHeader';
import { Page } from '@/components/Page';
import { SectionTitle } from '@/components/SectionTitle';
import { brand } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { getSupportDisputes, resolveJobDispute, type SupportDispute } from '@/lib/marketplace';

const reasonLabel: Record<string, string> = {
  service_quality: 'Qualidade do serviço', not_completed: 'Serviço não concluído',
  payment: 'Pagamento', safety: 'Segurança', other: 'Outro',
};

export default function DisputesScreen() {
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [items, setItems] = useState<SupportDispute[] | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!user) return;
    setError('');
    try {
      setItems(await getSupportDisputes(user.id));
    } catch (loadError) {
      setItems([]);
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as solicitações.');
    }
  }, [user]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  async function resolve(item: SupportDispute) {
    const response = responses[item.id]?.trim() ?? '';
    if (response.length < 10 || busyId) return;
    setBusyId(item.id);
    setError('');
    try {
      await resolveJobDispute(item.id, response);
      setItems((current) => current?.filter((entry) => entry.id !== item.id) ?? []);
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : 'Não foi possível registrar a resposta.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View style={styles.screen}>
      <BrandHeader mode="hire" />
      <Page>
        <Text style={styles.eyebrow}>ÁREA RESTRITA · SUPORTE</Text>
        <Text style={styles.title}>Solicitações de ajuda</Text>
        <Text style={styles.subtitle}>Revise os relatos com cuidado. A resposta fica registrada para as duas partes.</Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {!user ? <Pressable onPress={() => setAuthOpen(true)} style={styles.card}><Text style={styles.titleSmall}>Entre com uma conta autorizada</Text></Pressable> : items === null ? <Text style={styles.subtitle}>Carregando solicitações…</Text> : items.length === 0 && !error ? <View style={styles.card}><Text style={styles.titleSmall}>Nenhuma solicitação aberta</Text><Pressable onPress={() => void refresh()} style={styles.refresh}><Text style={styles.refreshText}>Atualizar fila</Text></Pressable></View> : (
          <>
            <SectionTitle title={`${items.length} ${items.length === 1 ? 'solicitação aberta' : 'solicitações abertas'}`} subtitle="Somente membros owner e suporte autorizados veem esta fila." />
            <View style={styles.list}>{items.map((item) => <View key={item.id} style={styles.card}>
              <Text style={styles.reason}>{reasonLabel[item.reason] ?? item.reason}</Text>
              <Text style={styles.job}>{item.jobTitle}{item.city ? ` · ${item.city}` : ''}</Text>
              <Text style={styles.people}>Contratante: {item.clientName} · Profissional: {item.workerName}</Text>
              <Text style={styles.people}>Relato enviado por {item.openedByName}</Text>
              <Text style={styles.details}>{item.details}</Text>
              <Text style={styles.label}>Resposta da equipe (mínimo de 10 caracteres)</Text>
              <TextInput maxLength={3000} multiline onChangeText={(text) => setResponses((current) => ({ ...current, [item.id]: text }))} placeholder="Registre a análise e a orientação…" placeholderTextColor="#87938E" style={styles.input} value={responses[item.id] ?? ''} />
              <Pressable disabled={busyId !== null || (responses[item.id]?.trim().length ?? 0) < 10} onPress={() => void resolve(item)} style={[styles.resolveButton, (busyId !== null || (responses[item.id]?.trim().length ?? 0) < 10) && { opacity: 0.55 }]}><Text style={styles.resolveText}>{busyId === item.id ? 'Registrando…' : 'Registrar resposta e encerrar'}</Text></Pressable>
            </View>)}</View>
          </>
        )}
      </Page>
      <AuthModal visible={authOpen} onClose={() => setAuthOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: brand.background, flex: 1 },
  eyebrow: { color: brand.orangeDark, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 28 },
  title: { color: brand.ink, fontSize: 31, fontWeight: '900', letterSpacing: -1, marginTop: 8 },
  titleSmall: { color: brand.ink, fontSize: 14, fontWeight: '900' },
  subtitle: { color: brand.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  error: { color: '#B42318', fontSize: 11, marginTop: 14 },
  list: { gap: 12 },
  card: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 14, borderWidth: 1, marginTop: 10, maxWidth: 820, padding: 14 },
  reason: { color: brand.orangeDark, fontSize: 10, fontWeight: '900' },
  job: { color: brand.ink, fontSize: 14, fontWeight: '900', marginTop: 7 },
  people: { color: brand.muted, fontSize: 9, marginTop: 5 },
  details: { backgroundColor: '#F7F8F7', borderRadius: 9, color: brand.ink, fontSize: 11, lineHeight: 17, marginTop: 12, padding: 11 },
  label: { color: brand.ink, fontSize: 9, fontWeight: '800', marginTop: 12 },
  input: { backgroundColor: '#F7F8F7', borderColor: brand.border, borderRadius: 9, borderWidth: 1, color: brand.ink, fontSize: 11, marginTop: 6, minHeight: 90, padding: 9, textAlignVertical: 'top' },
  resolveButton: { alignSelf: 'flex-start', backgroundColor: brand.orangeDark, borderRadius: 8, marginTop: 10, paddingHorizontal: 11, paddingVertical: 9 },
  resolveText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  refresh: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 5 },
  refreshText: { color: brand.orangeDark, fontSize: 10, fontWeight: '800' },
});
