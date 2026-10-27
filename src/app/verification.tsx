import { useCallback, useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthModal } from '@/components/AuthModal';
import { BrandHeader } from '@/components/BrandHeader';
import { Page } from '@/components/Page';
import { brand } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import {
  getProfessionalProfile,
  getWorkerVerificationDocuments,
  submitWorkerVerification,
  uploadWorkerVerificationDocument,
  type VerificationDocumentType,
  type WorkerVerificationDocument,
} from '@/lib/marketplace';

export default function VerificationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [documents, setDocuments] = useState<WorkerVerificationDocument[]>([]);
  const [status, setStatus] = useState<'not_submitted' | 'pending' | 'verified' | 'rejected'>('not_submitted');
  const [canWork, setCanWork] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyDocument, setBusyDocument] = useState<VerificationDocumentType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async (userId: string) => {
    const [professional, uploaded] = await Promise.all([
      getProfessionalProfile(userId),
      getWorkerVerificationDocuments(userId),
    ]);
    setCanWork(professional.canWork);
    setStatus(professional.verificationStatus);
    setDocuments(uploaded);
  }, []);

  useEffect(() => {
    let active = true;
    if (!user) {
      return () => { active = false; };
    }
    void Promise.resolve().then(() => refresh(user.id)).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar a verificação.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [refresh, user]);

  async function chooseDocument(documentType: VerificationDocumentType) {
    if (!user) { setAuthOpen(true); return; }
    setError('');
    setNotice('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Permita o acesso às fotos para selecionar a imagem do documento.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    setBusyDocument(documentType);
    try {
      await uploadWorkerVerificationDocument({
        userId: user.id,
        documentType,
        uri: result.assets[0].uri,
        mimeType: result.assets[0].mimeType,
      });
      await refresh(user.id);
      setNotice('Imagem enviada com segurança.');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Não foi possível enviar o documento.');
    } finally {
      setBusyDocument(null);
    }
  }

  async function sendForReview() {
    if (!user) return;
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await submitWorkerVerification();
      await refresh(user.id);
      setNotice('Documentos enviados para análise. Você pode acompanhar o status nesta tela.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível enviar para análise.');
    } finally {
      setSubmitting(false);
    }
  }

  const hasFront = documents.some((document) => document.documentType === 'identity_front');
  const hasBack = documents.some((document) => document.documentType === 'identity_back');
  const statusLabel = ({ not_submitted: 'Não enviada', pending: 'Em análise', verified: 'Verificada', rejected: 'Precisa de ajustes' })[status];

  return (
    <View style={styles.screen}>
      <BrandHeader mode="work" />
      <Page>
        <Text style={styles.eyebrow}>SEGURANÇA DO PERFIL</Text>
        <Text style={styles.title}>Verificação de identidade</Text>
        <Text style={styles.subtitle}>Envie a frente e o verso do seu documento para solicitar a análise do perfil profissional.</Text>

        {!user ? (
          <Pressable onPress={() => setAuthOpen(true)} style={styles.panel}><Text style={styles.panelTitle}>Entre para continuar</Text><Text style={styles.body}>Os documentos ficam vinculados à sua conta e não são publicados no perfil.</Text></Pressable>
        ) : loading ? (
          <View style={styles.panel}><Text style={styles.body}>Carregando seu status…</Text></View>
        ) : !canWork ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Ative seu perfil profissional primeiro</Text>
            <Text style={styles.body}>Cadastre ao menos um serviço. Depois você poderá enviar o documento para análise.</Text>
            <Pressable onPress={() => router.push('/profile')} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Cadastrar meus serviços</Text></Pressable>
          </View>
        ) : (
          <View style={styles.panel}>
            <View style={styles.statusPill}><Text style={styles.statusDot}>●</Text><Text style={styles.statusText}>STATUS: {statusLabel.toUpperCase()}</Text></View>
            {status === 'pending' ? <Text style={styles.body}>A equipe está analisando os documentos. Enquanto isso, você não precisa reenviar nada.</Text> : null}
            {status === 'verified' ? <Text style={styles.body}>Identidade confirmada. Seu perfil já pode enviar propostas para os pedidos elegíveis.</Text> : null}
            {status === 'rejected' ? <Text style={styles.body}>Confira a orientação da equipe e envie novas imagens nítidas da frente e do verso do documento.</Text> : null}
            {status !== 'verified' && status !== 'pending' ? <>
              <DocumentRow title="Frente do documento" description="CNH ou documento oficial com foto." uploaded={hasFront} busy={busyDocument === 'identity_front'} disabled={Boolean(busyDocument)} onPress={() => void chooseDocument('identity_front')} />
              <DocumentRow title="Verso do documento" description="Fotografe o verso inteiro, com os dados legíveis." uploaded={hasBack} busy={busyDocument === 'identity_back'} disabled={Boolean(busyDocument)} onPress={() => void chooseDocument('identity_back')} />
              <Text style={styles.privacyNote}>As imagens ficam em armazenamento privado. Só você e a equipe de verificação autorizada podem acessá-las. Não envie documentos de terceiros.</Text>
              <Text style={styles.consent}>Ao enviar, você confirma que este documento é seu e autoriza seu uso para verificar sua identidade no CONTRATEI.</Text>
              <Pressable disabled={!hasFront || !hasBack || submitting || Boolean(busyDocument)} onPress={() => void sendForReview()} style={[styles.primaryButton, (!hasFront || !hasBack || submitting || Boolean(busyDocument)) && styles.disabled]}>
                <Text style={styles.primaryButtonText}>{submitting ? 'Enviando para análise…' : 'Solicitar verificação'}</Text>
              </Pressable>
            </> : null}
          </View>
        )}

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <View style={styles.infoBox}><Text style={styles.infoTitle}>Dicas para a foto</Text><Text style={styles.body}>Use boa iluminação, evite reflexos, não corte as bordas e confira se o texto está legível antes de enviar.</Text></View>
      </Page>
      <AuthModal visible={authOpen} onClose={() => setAuthOpen(false)} />
    </View>
  );
}

function DocumentRow({ title, description, uploaded, busy, disabled, onPress }: { title: string; description: string; uploaded: boolean; busy: boolean; disabled: boolean; onPress: () => void }) {
  return (
    <View style={styles.documentRow}>
      <View style={{ flex: 1 }}><Text style={styles.documentTitle}>{title}</Text><Text style={styles.documentDescription}>{description}</Text><Text style={[styles.uploadState, uploaded && styles.uploaded]}>{uploaded ? '✓ Imagem armazenada' : 'Ainda não enviada'}</Text></View>
      <Pressable disabled={disabled} onPress={onPress} style={[styles.uploadButton, disabled && styles.disabled]}><Text style={styles.uploadButtonText}>{busy ? 'Enviando…' : uploaded ? 'Substituir' : 'Escolher foto'}</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: brand.background, flex: 1 },
  eyebrow: { color: brand.orangeDark, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 30 },
  title: { color: brand.ink, fontSize: 34, fontWeight: '900', letterSpacing: -1.2, marginTop: 8 },
  subtitle: { color: brand.muted, fontSize: 13, lineHeight: 20, marginTop: 6, maxWidth: 700 },
  panel: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 17, borderWidth: 1, marginTop: 20, maxWidth: 760, padding: 18 },
  panelTitle: { color: brand.ink, fontSize: 16, fontWeight: '900' },
  body: { color: brand.muted, fontSize: 11, lineHeight: 17, marginTop: 6 },
  statusPill: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: brand.orangeSoft, borderRadius: 20, flexDirection: 'row', gap: 7, paddingHorizontal: 10, paddingVertical: 7 },
  statusDot: { color: brand.orangeDark, fontSize: 9 },
  statusText: { color: brand.orangeDark, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  documentRow: { alignItems: 'center', borderColor: brand.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 14, padding: 13 },
  documentTitle: { color: brand.ink, fontSize: 12, fontWeight: '800' },
  documentDescription: { color: brand.muted, fontSize: 10, marginTop: 3 },
  uploadState: { color: brand.muted, fontSize: 9, fontWeight: '700', marginTop: 7 },
  uploaded: { color: brand.success },
  uploadButton: { backgroundColor: brand.orangeSoft, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 9 },
  uploadButtonText: { color: brand.orangeDark, fontSize: 10, fontWeight: '800' },
  privacyNote: { backgroundColor: brand.successSoft, borderRadius: 10, color: brand.success, fontSize: 10, lineHeight: 15, marginTop: 14, padding: 11 },
  consent: { color: brand.muted, fontSize: 9, lineHeight: 14, marginTop: 12 },
  primaryButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: brand.orange, borderRadius: 11, marginTop: 15, paddingHorizontal: 16, paddingVertical: 12 },
  primaryButtonText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  disabled: { opacity: 0.5 },
  notice: { color: brand.success, fontSize: 11, fontWeight: '700', marginTop: 13, maxWidth: 760 },
  error: { color: '#B42318', fontSize: 11, fontWeight: '700', marginTop: 13, maxWidth: 760 },
  infoBox: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 13, borderWidth: 1, marginBottom: 20, marginTop: 17, maxWidth: 760, padding: 14 },
  infoTitle: { color: brand.ink, fontSize: 12, fontWeight: '900' },
});
