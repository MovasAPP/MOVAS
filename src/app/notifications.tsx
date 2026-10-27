import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { AuthModal } from '@/components/AuthModal';
import { BrandHeader } from '@/components/BrandHeader';
import { Page } from '@/components/Page';
import { SectionTitle } from '@/components/SectionTitle';
import { brand } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { getMyNotifications, markNotificationRead, type AppNotification } from '@/lib/marketplace';

function destination(item: AppNotification) {
  if (item.type === 'proposal_received') return '/my-requests' as const;
  if (item.type === 'proposal_accepted' || item.type === 'payment_confirmed' || item.type === 'new_message' || item.type === 'completion_requested') {
    return item.jobId ? { pathname: '/chat' as const, params: { jobId: item.jobId } } : '/my-proposals' as const;
  }
  if (item.type === 'completion_confirmed') return item.jobId ? { pathname: '/review-job' as const, params: { jobId: item.jobId } } : '/my-proposals' as const;
  if (item.type === 'dispute_opened') return '/disputes' as const;
  if (item.type === 'dispute_update') return item.jobId ? { pathname: '/dispute' as const, params: { jobId: item.jobId } } : '/my-requests' as const;
  return '/profile' as const;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setItems(await getMyNotifications(user.id));
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as notificações.');
    }
  }, [user]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  async function open(item: AppNotification) {
    if (item.readAt === null) {
      try {
        await markNotificationRead(item.id);
        setItems((current) => current?.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry) ?? []);
      } catch (readError) {
        setError(readError instanceof Error ? readError.message : 'Não foi possível atualizar esta notificação.');
      }
    }
    router.push(destination(item));
  }

  return (
    <View style={styles.screen}>
      <BrandHeader mode="hire" />
      <Page>
        <Text style={styles.eyebrow}>CENTRAL DE ATIVIDADE</Text>
        <Text style={styles.title}>Notificações</Text>
        <Text style={styles.subtitle}>Novas propostas, mensagens, conclusões e atualizações do suporte.</Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {!user ? <Pressable onPress={() => setAuthOpen(true)} style={styles.card}><Text style={styles.cardTitle}>Entre para ver suas notificações</Text></Pressable> : items === null ? <Text style={styles.subtitle}>Carregando…</Text> : items.length === 0 ? <View style={styles.card}><Text style={styles.cardTitle}>Tudo em dia</Text><Text style={styles.summary}>Quando houver atualizações das suas contratações, elas aparecerão aqui.</Text></View> : (
          <>
            <SectionTitle title={`${items.filter((item) => !item.readAt).length} não lidas`} subtitle="A atividade da sua conta fica sincronizada entre dispositivos." />
            <View style={styles.list}>{items.map((item) => <Pressable key={item.id} onPress={() => void open(item)} style={[styles.card, !item.readAt && styles.unread]}>
              <View style={styles.heading}><Text style={styles.cardTitle}>{item.title}</Text>{!item.readAt ? <View style={styles.dot} /> : null}</View>
              <Text style={styles.summary}>{item.summary}</Text>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</Text>
            </Pressable>)}</View>
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
  subtitle: { color: brand.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  error: { color: '#B42318', fontSize: 10, marginTop: 12 },
  list: { gap: 9 },
  card: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 13, borderWidth: 1, marginTop: 10, maxWidth: 780, padding: 13 },
  unread: { backgroundColor: '#FFFCF6', borderColor: '#E8C49A' },
  heading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { color: brand.ink, fontSize: 12, fontWeight: '900' },
  dot: { backgroundColor: brand.orange, borderRadius: 5, height: 9, width: 9 },
  summary: { color: brand.muted, fontSize: 10, lineHeight: 15, marginTop: 5 },
  date: { color: brand.muted, fontSize: 8, marginTop: 8 },
});
