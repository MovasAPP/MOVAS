import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BrandHeader } from '@/components/BrandHeader';
import { Page } from '@/components/Page';
import { SectionTitle } from '@/components/SectionTitle';
import { AuthModal } from '@/components/AuthModal';
import { brand, categories } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { activateProfessionalProfile, getProfessionalProfile, getReviewerRole, type ProfessionalProfile } from '@/lib/marketplace';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [serviceTitle, setServiceTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [price, setPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState<'quote' | 'hour' | 'job' | 'day'>('quote');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [canReview, setCanReview] = useState(false);
  const displayName = user?.user_metadata.public_name || user?.email?.split('@')[0] || 'Seu perfil CONTRATEI';

  useEffect(() => {
    let active = true;
    if (!user) return () => { active = false; };
    void getProfessionalProfile(user.id).then((nextProfile) => {
      if (active) {
        setProfile(nextProfile);
        setProfileUserId(user.id);
        if (nextProfile.city) setCity(nextProfile.city);
      }
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar seu perfil profissional.');
    });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    let active = true;
    if (!user) return () => { active = false; };
    void Promise.resolve().then(() => getReviewerRole(user.id)).then((role) => {
      if (active) setCanReview(role === 'owner' || role === 'verifier');
    }).catch(() => {
      if (active) setCanReview(false);
    });
    return () => { active = false; };
  }, [user]);

  async function submitProfessionalProfile() {
    if (!user) { setAuthOpen(true); return; }
    if (!category) { setError('Escolha a categoria do seu serviço.'); return; }
    if (serviceTitle.trim().length < 3) { setError('Informe um título com pelo menos 3 caracteres.'); return; }
    if (!city.trim()) { setError('Informe a cidade onde você atende.'); return; }
    const amountText = price.trim().replace(/[^\d,.-]/g, '').replace(',', '.');
    const amount = amountText ? Number(amountText) : null;
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) { setError('Confira o preço informado.'); return; }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await activateProfessionalProfile({
        userId: user.id,
        category,
        title: serviceTitle.trim(),
        description: description.trim(),
        city: city.trim(),
        startingPrice: amount,
        priceUnit,
      });
      const nextProfile = await getProfessionalProfile(user.id);
      setProfile(nextProfile);
      setProfileUserId(user.id);
      setServiceTitle('');
      setDescription('');
      setPrice('');
      setCategory('');
      setMessage('Serviço cadastrado. Seu perfil profissional já está ativo.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar seu perfil. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  const currentProfile = user && profileUserId === user.id ? profile : null;
  const verificationCopy = {
    not_submitted: ['Ainda não enviada', 'Envie a frente e o verso do seu documento para solicitar a análise de identidade.'],
    pending: ['Em análise', 'Sua solicitação de verificação está aguardando análise.'],
    verified: ['Verificado', 'Seu perfil profissional está verificado e pode enviar propostas.'],
    rejected: ['Precisa de ajustes', 'A equipe solicitou novas imagens. Você pode substituir as fotos e reenviar para análise.'],
  } as const;
  const status = currentProfile?.verificationStatus ?? 'not_submitted';
  return (
    <View style={styles.screen}>
      <BrandHeader mode="hire" />
      <Page>
        <Text style={styles.eyebrow}>MINHA CONTA</Text>
        <Text style={styles.title}>Um perfil. Dois jeitos de usar.</Text>
        <Text style={styles.subtitle}>Com a mesma conta, você pode contratar serviços e também trabalhar.</Text>
        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>MB</Text></View>
          <View style={{ flex: 1 }}><Text style={styles.name}>{displayName}</Text><Text style={styles.city}>{user?.email ?? 'Entre ou crie sua conta para começar.'}</Text></View>
          {user ? <Pressable onPress={() => void supabase.auth.signOut()} style={styles.signButton}><Text style={styles.signButtonText}>Sair</Text></Pressable> : <Pressable onPress={() => setAuthOpen(true)} style={styles.signButton}><Text style={styles.signButtonText}>Entrar</Text></Pressable>}
        </View>
        <SectionTitle title="Escolha o que quer fazer" subtitle="Alterne entre os modos quando precisar." />
        <View style={styles.modeGrid}>
          <Pressable onPress={() => router.push('/')} style={styles.modeCard}>
            <Text style={styles.modeIcon}>⌂</Text><Text style={styles.modeTitle}>Quero contratar</Text><Text style={styles.modeText}>Publicar um pedido, receber propostas e escolher um profissional.</Text><Text style={styles.modeLink}>Abrir modo contratante →</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/work')} style={[styles.modeCard, styles.workCard]}>
            <Text style={[styles.modeIcon, styles.workModeIcon]}>↗</Text><Text style={[styles.modeTitle, styles.workModeTitle]}>Quero trabalhar</Text><Text style={[styles.modeText, styles.workModeText]}>Encontrar oportunidades e enviar propostas de serviço.</Text><Text style={[styles.modeLink, styles.workModeLink]}>Abrir oportunidades →</Text>
          </Pressable>
        </View>
        {user ? (
          <Pressable onPress={() => router.push('/my-requests')} style={styles.requestsLink}>
            <View style={styles.requestsIcon}><Text style={styles.requestsIconText}>▤</Text></View>
            <View style={{ flex: 1 }}><Text style={styles.requestsTitle}>Meus pedidos e propostas</Text><Text style={styles.requestsSubtitle}>Acompanhe as respostas dos profissionais aos seus pedidos.</Text></View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ) : null}
        <SectionTitle title="Seu perfil profissional" subtitle="Cadastre o que você faz e onde atende. O perfil é compartilhado entre Android, iOS e site." />
        {!user ? (
          <Pressable onPress={() => setAuthOpen(true)} style={styles.signUpPrompt}><Text style={styles.signUpText}>Entre ou crie sua conta para cadastrar seus serviços →</Text></Pressable>
        ) : (
          <View style={styles.professionalPanel}>
            <View style={styles.statusCard}>
              <View style={styles.statusIcon}><Text style={styles.statusCheck}>{status === 'verified' ? '✓' : '•'}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statusLabel}>VERIFICAÇÃO DE IDENTIDADE</Text>
                <Text style={styles.statusTitle}>{verificationCopy[status][0]}</Text>
                <Text style={styles.statusDescription}>{verificationCopy[status][1]}</Text>
              </View>
            </View>
            {currentProfile?.canWork && status !== 'verified' ? <Pressable onPress={() => router.push('/verification')} style={styles.verifyLink}><Text style={styles.verifyLinkText}>{status === 'pending' ? 'Acompanhar análise →' : status === 'rejected' ? 'Corrigir documentos →' : 'Enviar documentos →'}</Text></Pressable> : null}
            {currentProfile?.services.length ? (
              <View style={styles.servicesList}>
                <Text style={styles.formTitle}>Seus serviços cadastrados</Text>
                {currentProfile.services.map((service) => <View key={service.id} style={styles.serviceRow}>
                  <View style={{ flex: 1 }}><Text style={styles.serviceName}>{service.title}</Text><Text style={styles.serviceMeta}>{service.category} · {service.city}, RS</Text></View>
                  <Text style={styles.servicePrice}>{service.startingPrice === null ? 'Sob orçamento' : `R$ ${service.startingPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}{service.startingPrice !== null && service.priceUnit !== 'quote' ? ` / ${unitLabel(service.priceUnit)}` : ''}</Text>
                </View>)}
              </View>
            ) : null}
            <Text style={styles.formTitle}>{currentProfile?.canWork ? 'Adicionar outro serviço' : 'Começar a trabalhar'}</Text>
            <Text style={styles.formHint}>Você pode cadastrar mais de uma categoria e atender em diferentes tipos de serviço.</Text>
            <Text style={styles.fieldLabel}>Categoria</Text>
            <View style={styles.categoryGrid}>{categories.map((item) => <Pressable key={item.name} onPress={() => setCategory(item.name)} style={[styles.categoryChip, category === item.name && styles.categoryChipActive]}><Text style={styles.categoryChipText}>{item.icon}  {item.name}</Text></Pressable>)}</View>
            <Text style={styles.fieldLabel}>Nome do serviço</Text>
            <TextInput onChangeText={setServiceTitle} placeholder="Ex.: Pintura residencial" placeholderTextColor="#87938E" style={styles.input} value={serviceTitle} />
            <Text style={styles.fieldLabel}>Descrição (opcional)</Text>
            <TextInput multiline onChangeText={setDescription} placeholder="Conte sua experiência e o que está incluído." placeholderTextColor="#87938E" style={[styles.input, styles.textArea]} value={description} />
            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}><Text style={styles.fieldLabel}>Cidade onde atende</Text><TextInput onChangeText={setCity} placeholder="Ex.: Tramandaí" placeholderTextColor="#87938E" style={styles.input} value={city} /></View>
              <View style={{ flex: 1 }}><Text style={styles.fieldLabel}>Preço inicial (opcional)</Text><TextInput keyboardType="decimal-pad" onChangeText={setPrice} placeholder="R$" placeholderTextColor="#87938E" style={styles.input} value={price} /></View>
            </View>
            <Text style={styles.fieldLabel}>Como cobra?</Text>
            <View style={styles.unitRow}>{(['quote', 'hour', 'job', 'day'] as const).map((unit) => <Pressable key={unit} onPress={() => setPriceUnit(unit)} style={[styles.unitChip, priceUnit === unit && styles.unitChipActive]}><Text style={[styles.unitText, priceUnit === unit && styles.unitTextActive]}>{unitLabel(unit)}</Text></Pressable>)}</View>
            {message ? <Text style={styles.successMessage}>{message}</Text> : null}
            {error ? <Text accessibilityRole="alert" style={styles.errorMessage}>{error}</Text> : null}
            <Pressable disabled={busy} onPress={() => void submitProfessionalProfile()} style={[styles.submitButton, busy && { opacity: 0.65 }]}><Text style={styles.submitButtonText}>{busy ? 'Salvando…' : currentProfile?.canWork ? 'Adicionar serviço' : 'Ativar perfil profissional'}</Text></Pressable>
          </View>
        )}
        <SectionTitle title="Sua confiança" subtitle="Acompanhe aqui o status da verificação do seu perfil." />
        <Pressable onPress={() => router.push('/safety')} style={styles.securityRow}><View style={styles.securityIcon}><Text>🔒</Text></View><View style={{ flex: 1 }}><Text style={styles.securityTitle}>Identidade e privacidade</Text><Text style={styles.securityText}>Veja como documentos e informações serão protegidos.</Text></View><Text style={styles.arrow}>›</Text></Pressable>
        {canReview ? <Pressable onPress={() => router.push('/review')} style={styles.securityRow}><View style={[styles.securityIcon, { backgroundColor: '#FFF2D7' }]}><Text>✓</Text></View><View style={{ flex: 1 }}><Text style={styles.securityTitle}>Revisão da equipe</Text><Text style={styles.securityText}>Analisar solicitações de verificação pendentes.</Text></View><Text style={styles.arrow}>›</Text></Pressable> : null}
        <View style={styles.note}><Text style={styles.noteText}>CONTRATEI pertence a Murilo Bueno e é um projeto independente da Steinmetz.</Text></View>
      </Page>
      <AuthModal visible={authOpen} onClose={() => setAuthOpen(false)} />
    </View>
  );
}

function unitLabel(unit: string) {
  return ({ quote: 'Orçamento', hour: 'Hora', job: 'Serviço', day: 'Diária' } as Record<string, string>)[unit] ?? unit;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: brand.background, flex: 1 },
  eyebrow: { color: brand.orangeDark, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 30 },
  title: { color: brand.ink, fontSize: 34, fontWeight: '900', letterSpacing: -1.2, marginTop: 8 },
  subtitle: { color: brand.muted, fontSize: 13, marginTop: 6 },
  profileCard: { alignItems: 'center', backgroundColor: '#fff', borderColor: brand.border, borderRadius: 17, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 22, maxWidth: 860, padding: 16 },
  avatar: { alignItems: 'center', backgroundColor: brand.orangeSoft, borderRadius: 20, height: 55, justifyContent: 'center', width: 55 },
  avatarText: { color: brand.orangeDark, fontSize: 16, fontWeight: '900' },
  name: { color: brand.ink, fontSize: 13, fontWeight: '800' },
  city: { color: brand.muted, fontSize: 10, marginTop: 4 },
  badge: { color: brand.success, fontSize: 9, fontWeight: '900' },
  signButton: { backgroundColor: brand.orange, borderRadius: 9, paddingHorizontal: 13, paddingVertical: 9 },
  signButtonText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  modeCard: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 16, borderWidth: 1, flexGrow: 1, maxWidth: 420, minHeight: 190, minWidth: 245, padding: 17 },
  workCard: { backgroundColor: brand.navy, borderColor: brand.navy },
  modeIcon: { color: brand.orange, fontSize: 24 },
  workModeIcon: { color: brand.yellow },
  modeTitle: { color: brand.ink, fontSize: 16, fontWeight: '800', marginTop: 10 },
  workModeTitle: { color: '#fff' },
  modeText: { color: brand.muted, fontSize: 11, lineHeight: 17, marginTop: 6, maxWidth: 300 },
  workModeText: { color: '#C7D4DA' },
  modeLink: { color: brand.orangeDark, fontSize: 10, fontWeight: '800', marginTop: 'auto', paddingTop: 16 },
  workModeLink: { color: brand.yellow },
  requestsLink: { alignItems: 'center', backgroundColor: '#fff', borderColor: brand.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 11, marginTop: 13, maxWidth: 860, padding: 13 },
  requestsIcon: { alignItems: 'center', backgroundColor: brand.orangeSoft, borderRadius: 10, height: 37, justifyContent: 'center', width: 37 },
  requestsIconText: { color: brand.orangeDark, fontSize: 18 },
  requestsTitle: { color: brand.ink, fontSize: 12, fontWeight: '900' },
  requestsSubtitle: { color: brand.muted, fontSize: 9, lineHeight: 14, marginTop: 3 },
  securityRow: { alignItems: 'center', backgroundColor: '#fff', borderColor: brand.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 11, maxWidth: 860, padding: 14 },
  securityIcon: { alignItems: 'center', backgroundColor: brand.successSoft, borderRadius: 11, height: 38, justifyContent: 'center', width: 38 },
  securityTitle: { color: brand.ink, fontSize: 12, fontWeight: '800' },
  securityText: { color: brand.muted, fontSize: 10, marginTop: 4 },
  arrow: { color: brand.muted, fontSize: 24 },
  note: { backgroundColor: '#FFF4EA', borderRadius: 10, marginTop: 18, maxWidth: 860, padding: 11 },
  noteText: { color: brand.orangeDark, fontSize: 10, fontWeight: '700' },
  signUpPrompt: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 14, borderWidth: 1, maxWidth: 860, padding: 16 },
  signUpText: { color: brand.orangeDark, fontSize: 12, fontWeight: '800' },
  professionalPanel: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 17, borderWidth: 1, maxWidth: 860, padding: 17 },
  statusCard: { alignItems: 'flex-start', backgroundColor: '#F5F8F6', borderRadius: 13, flexDirection: 'row', gap: 11, marginBottom: 18, padding: 13 },
  statusIcon: { alignItems: 'center', backgroundColor: brand.successSoft, borderRadius: 18, height: 34, justifyContent: 'center', width: 34 },
  statusCheck: { color: brand.success, fontSize: 19, fontWeight: '900' },
  statusLabel: { color: brand.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  statusTitle: { color: brand.ink, fontSize: 14, fontWeight: '900', marginTop: 3 },
  statusDescription: { color: brand.muted, fontSize: 10, lineHeight: 15, marginTop: 4 },
  verifyLink: { alignSelf: 'flex-start', marginBottom: 16, marginTop: -8, paddingVertical: 3 },
  verifyLinkText: { color: brand.orangeDark, fontSize: 10, fontWeight: '900' },
  servicesList: { borderBottomColor: brand.border, borderBottomWidth: 1, marginBottom: 16, paddingBottom: 12 },
  formTitle: { color: brand.ink, fontSize: 15, fontWeight: '900', marginTop: 5 },
  formHint: { color: brand.muted, fontSize: 10, lineHeight: 15, marginTop: 4 },
  serviceRow: { alignItems: 'center', borderTopColor: '#F0F2F0', borderTopWidth: 1, flexDirection: 'row', gap: 12, marginTop: 10, paddingTop: 10 },
  serviceName: { color: brand.ink, fontSize: 12, fontWeight: '800' },
  serviceMeta: { color: brand.muted, fontSize: 9, marginTop: 3 },
  servicePrice: { color: brand.orangeDark, fontSize: 10, fontWeight: '800' },
  fieldLabel: { color: brand.ink, fontSize: 10, fontWeight: '800', marginBottom: 6, marginTop: 13 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  categoryChip: { backgroundColor: '#F5F7F5', borderColor: brand.border, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  categoryChipActive: { backgroundColor: brand.orangeSoft, borderColor: brand.orange },
  categoryChipText: { color: brand.ink, fontSize: 10, fontWeight: '700' },
  input: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 10, borderWidth: 1, color: brand.ink, fontSize: 12, minHeight: 43, paddingHorizontal: 11, paddingVertical: 9 },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  inputRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  unitChip: { backgroundColor: '#F5F7F5', borderColor: brand.border, borderRadius: 9, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 },
  unitChipActive: { backgroundColor: brand.orange, borderColor: brand.orange },
  unitText: { color: brand.ink, fontSize: 10, fontWeight: '700' },
  unitTextActive: { color: '#fff' },
  successMessage: { color: brand.success, fontSize: 11, fontWeight: '700', marginTop: 12 },
  errorMessage: { color: '#B42318', fontSize: 11, fontWeight: '700', marginTop: 12 },
  submitButton: { alignItems: 'center', backgroundColor: brand.orange, borderRadius: 11, marginTop: 16, padding: 13 },
  submitButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
});
