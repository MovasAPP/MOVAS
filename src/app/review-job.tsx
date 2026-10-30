import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { AuthModal } from '@/components/AuthModal';
import { BrandHeader } from '@/components/BrandHeader';
import { Page } from '@/components/Page';
import { brand } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { getJobReviewContext, submitJobReview } from '@/lib/marketplace';

export default function ReviewJobScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!jobId || !user) return () => { active = false; };
    void getJobReviewContext(jobId).then((context) => {
      if (active) {
        setSubjectName(context.subjectName);
        setAlreadyReviewed(context.alreadyReviewed);
        setError('');
      }
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível abrir a avaliação.');
    });
    return () => { active = false; };
  }, [jobId, user]));

  async function save() {
    if (!jobId || busy || alreadyReviewed || saved) return;
    setBusy(true);
    setError('');
    try {
      await submitJobReview(jobId, rating, comment);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível enviar sua avaliação.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <BrandHeader mode="hire" />
      <Page>
        <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹ Voltar</Text></Pressable>
        <Text style={styles.eyebrow}>AVALIAÇÃO DA CONTRATAÇÃO</Text>
        <Text style={styles.title}>Como foi com {subjectName || 'a outra parte'}?</Text>
        <Text style={styles.subtitle}>Sua avaliação ajuda outras pessoas a contratar com mais confiança.</Text>
        {!user ? <Pressable onPress={() => setAuthOpen(true)} style={styles.card}><Text style={styles.subtitle}>Entre na sua conta para avaliar.</Text></Pressable> : error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : alreadyReviewed || saved ? (
          <View style={styles.card}><Text style={styles.success}>{saved ? 'Avaliação enviada. Obrigado por compartilhar sua experiência.' : 'Você já avaliou esta contratação.'}</Text></View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>Sua nota</Text>
            <View style={styles.stars}>{[1, 2, 3, 4, 5].map((value) => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${value} estrelas`} onPress={() => setRating(value)} style={styles.starButton}><Text style={[styles.star, value <= rating && styles.selectedStar]}>★</Text></Pressable>)}</View>
            <Text style={styles.label}>Comentário (opcional)</Text>
            <TextInput maxLength={1000} multiline onChangeText={setComment} placeholder="Conte como foi o serviço…" placeholderTextColor="#87938E" style={styles.input} value={comment} />
            <Pressable disabled={busy} onPress={() => void save()} style={[styles.submit, busy && { opacity: 0.6 }]}><Text style={styles.submitText}>{busy ? 'Enviando…' : 'Enviar avaliação'}</Text></Pressable>
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
  subtitle: { color: brand.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  error: { color: '#B42318', fontSize: 11, marginTop: 18 },
  card: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 15, borderWidth: 1, marginTop: 20, maxWidth: 640, padding: 17 },
  label: { color: brand.ink, fontSize: 11, fontWeight: '800', marginTop: 10 },
  stars: { flexDirection: 'row', gap: 5, marginVertical: 12 },
  starButton: { padding: 4 },
  star: { color: '#D5DAD7', fontSize: 32 },
  selectedStar: { color: '#E9A338' },
  input: { backgroundColor: '#F7F8F7', borderColor: brand.border, borderRadius: 9, borderWidth: 1, color: brand.ink, fontSize: 12, marginTop: 7, minHeight: 110, padding: 10, textAlignVertical: 'top' },
  submit: { alignSelf: 'flex-start', backgroundColor: brand.orangeDark, borderRadius: 9, marginTop: 13, paddingHorizontal: 13, paddingVertical: 10 },
  submitText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  success: { color: '#246044', fontSize: 12, lineHeight: 19 },
});
