import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { AuthModal } from '@/components/AuthModal';
import { BrandHeader } from '@/components/BrandHeader';
import { Page } from '@/components/Page';
import { brand } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { confirmJobCompletion, getJobChat, requestJobCompletion, sendJobMessage, type JobChat } from '@/lib/marketplace';
import { supabase } from '@/lib/supabase';

const statusLabel: Record<JobChat['status'], string> = {
  open: 'Pedido aberto',
  awaiting_payment: 'Aguardando pagamento',
  in_progress: 'Serviço em andamento',
  completion_pending: 'Aguardando confirmação do contratante',
  completed: 'Serviço concluído',
  cancelled: 'Pedido cancelado',
};

export default function JobChatScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [chat, setChat] = useState<JobChat | null>(null);
  const [loadedRequestKey, setLoadedRequestKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const requestKey = `${user?.id ?? ''}:${jobId ?? ''}`;
  const currentChat = loadedRequestKey === requestKey ? chat : null;

  const refresh = useCallback(async () => {
    if (!jobId || !user) return;
    setError('');
    try {
      setChat(await getJobChat(jobId));
      setLoadedRequestKey(`${user.id}:${jobId}`);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar a conversa.');
    }
  }, [jobId, user]);

  useFocusEffect(useCallback(() => {
    void refresh();
    if (!jobId || !user) return;
    const channel = supabase.channel(`job-chat-${jobId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'job_messages', filter: `job_id=eq.${jobId}` }, () => void refresh())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [jobId, refresh, user]));

  async function send() {
    if (!jobId || !message.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await sendJobMessage(jobId, message);
      setMessage('');
      await refresh();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Não foi possível enviar a mensagem.');
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    if (!currentChat || busy) return;
    setBusy(true);
    setError('');
    try {
      if (currentChat.isClient) await confirmJobCompletion(currentChat.id);
      else await requestJobCompletion(currentChat.id);
      await refresh();
    } catch (completionError) {
      setError(completionError instanceof Error ? completionError.message : 'Não foi possível atualizar a conclusão.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <BrandHeader mode={currentChat?.isClient === false ? 'work' : 'hire'} />
      <Page>
        <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹ Voltar</Text></Pressable>
        {!user ? (
          <Pressable onPress={() => setAuthOpen(true)} style={styles.card}><Text style={styles.title}>Entre para abrir a conversa</Text></Pressable>
        ) : !currentChat ? (
          <View style={styles.card}><Text style={styles.loading}>{error || 'Carregando conversa…'}</Text><Pressable onPress={() => void refresh()} style={styles.refresh}><Text style={styles.refreshText}>Tentar novamente</Text></Pressable></View>
        ) : (
          <>
            <Text style={styles.eyebrow}>CONVERSA DA CONTRATAÇÃO</Text>
            <Text style={styles.title}>{currentChat.title}</Text>
            <Text style={styles.subtitle}>Com {currentChat.otherPartyName} · {statusLabel[currentChat.status]}</Text>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <View style={styles.card}>
              <View style={styles.messageList}>
                {currentChat.messages.length ? currentChat.messages.map((item) => {
                  const mine = item.senderId === user.id;
                  return <View key={item.id} style={[styles.messageBubble, mine ? styles.myMessage : styles.theirMessage]}>
                    <Text style={[styles.messageBody, mine && styles.myMessageBody]}>{item.body}</Text>
                    <Text style={[styles.messageDate, mine && styles.myMessageDate]}>{new Date(item.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</Text>
                  </View>;
                }) : <Text style={styles.empty}>Ainda não há mensagens. Combine os detalhes do serviço por aqui.</Text>}
              </View>
              {currentChat.status === 'in_progress' ? (
                <View style={styles.composer}>
                  <TextInput multiline maxLength={2000} onChangeText={setMessage} placeholder="Escreva uma mensagem…" placeholderTextColor="#87938E" style={styles.input} value={message} />
                  <Pressable disabled={busy || !message.trim()} onPress={() => void send()} style={[styles.sendButton, (busy || !message.trim()) && { opacity: 0.5 }]}><Text style={styles.sendText}>{busy ? 'Enviando…' : 'Enviar'}</Text></Pressable>
                </View>
              ) : currentChat.status === 'completion_pending' ? (
                <View style={styles.completionBox}>
                  {currentChat.isClient ? <><Text style={styles.completionText}>O profissional informou que concluiu o serviço. Confira o resultado antes de confirmar.</Text><Pressable disabled={busy} onPress={() => void complete()} style={styles.confirmButton}><Text style={styles.confirmText}>{busy ? 'Salvando…' : 'Confirmar conclusão'}</Text></Pressable></> : <Text style={styles.completionText}>Conclusão enviada. A avaliação ficará disponível quando o contratante confirmar.</Text>}
                </View>
              ) : currentChat.status === 'completed' ? (
                <View style={styles.completionBox}><Text style={styles.completionText}>Serviço concluído. Você pode avaliar a outra parte.</Text><Pressable onPress={() => router.push({ pathname: '/review-job', params: { jobId: currentChat.id } })} style={styles.confirmButton}><Text style={styles.confirmText}>Avaliar serviço</Text></Pressable></View>
              ) : null}
              {['in_progress', 'completion_pending', 'completed'].includes(currentChat.status) ? <Pressable onPress={() => router.push({ pathname: '/dispute', params: { jobId: currentChat.id } })} style={styles.disputeLink}><Text style={styles.disputeText}>Precisa de ajuda? Abrir uma solicitação de suporte</Text></Pressable> : null}
              <Pressable onPress={() => void refresh()} style={styles.refresh}><Text style={styles.refreshText}>Atualizar conversa</Text></Pressable>
            </View>
          </>
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
  eyebrow: { color: brand.orangeDark, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 10 },
  title: { color: brand.ink, fontSize: 26, fontWeight: '900', letterSpacing: -0.8, marginTop: 8 },
  subtitle: { color: brand.muted, fontSize: 12, marginTop: 6 },
  error: { color: '#B42318', fontSize: 11, marginTop: 14 },
  loading: { color: brand.muted, fontSize: 12 },
  card: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 16, borderWidth: 1, marginTop: 18, maxWidth: 760, padding: 15 },
  messageList: { gap: 10, minHeight: 150 },
  messageBubble: { borderRadius: 12, maxWidth: '86%', padding: 11 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: brand.orange },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: '#F1F4F2' },
  messageBody: { color: brand.ink, fontSize: 12, lineHeight: 18 },
  myMessageBody: { color: '#fff' },
  messageDate: { color: brand.muted, fontSize: 8, marginTop: 6 },
  myMessageDate: { color: '#FFF1E9' },
  empty: { color: brand.muted, fontSize: 11, lineHeight: 17, paddingVertical: 20, textAlign: 'center' },
  composer: { borderColor: brand.border, borderTopWidth: 1, flexDirection: 'row', gap: 8, marginTop: 15, paddingTop: 12 },
  input: { backgroundColor: '#F7F8F7', borderColor: brand.border, borderRadius: 9, borderWidth: 1, color: brand.ink, flex: 1, fontSize: 12, maxHeight: 120, minHeight: 42, padding: 10, textAlignVertical: 'top' },
  sendButton: { alignSelf: 'flex-end', backgroundColor: brand.orangeDark, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 12 },
  sendText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  completionBox: { backgroundColor: '#FFF8ED', borderRadius: 11, marginTop: 15, padding: 12 },
  completionText: { color: brand.ink, fontSize: 11, lineHeight: 17 },
  confirmButton: { alignSelf: 'flex-start', backgroundColor: brand.orangeDark, borderRadius: 9, marginTop: 10, paddingHorizontal: 12, paddingVertical: 9 },
  confirmText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  disputeLink: { alignSelf: 'flex-start', marginTop: 13, paddingVertical: 4 },
  disputeText: { color: '#A23B27', fontSize: 10, fontWeight: '800' },
  refresh: { alignSelf: 'flex-start', marginTop: 13, paddingVertical: 5 },
  refreshText: { color: brand.orangeDark, fontSize: 10, fontWeight: '800' },
});
