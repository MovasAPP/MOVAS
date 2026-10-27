import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BrandHeader } from '@/components/BrandHeader';
import { Page } from '@/components/Page';
import { QuoteRequest, QuoteRequestModal } from '@/components/QuoteRequestModal';
import { AuthModal } from '@/components/AuthModal';
import { SectionTitle } from '@/components/SectionTitle';
import { brand, categories } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { createJobRequest, getVerifiedWorkerServices, type VerifiedServiceCard } from '@/lib/marketplace';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [category, setCategory] = useState('Todas');
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('Porto Alegre');
  const [requestInitialCategory, setRequestInitialCategory] = useState('');
  const [professionals, setProfessionals] = useState<VerifiedServiceCard[] | null>(null);
  const [directoryError, setDirectoryError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    void getVerifiedWorkerServices().then((items) => {
      if (active) setProfessionals(items);
    }).catch(() => {
      if (active) {
        setProfessionals([]);
        setDirectoryError('Não foi possível carregar os perfis agora. Tente novamente em instantes.');
      }
    });
    return () => { active = false; };
  }, []);

  const visibleProfessionals = useMemo(() => (professionals ?? []).filter((person) => {
    const categoryMatch = category === 'Todas' || person.category === category;
    const searchMatch = !search || `${person.name} ${person.title} ${person.category} ${person.city}`.toLowerCase().includes(search.toLowerCase());
    const cityMatch = !city || person.city.toLowerCase().includes(city.toLowerCase());
    return categoryMatch && searchMatch && cityMatch;
  }), [category, city, professionals, search]);

  function openRequest(targetCategory?: string) {
    setRequestInitialCategory(targetCategory ?? (category === 'Todas' ? '' : category));
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setRequestOpen(true);
  }

  async function submitRequest(request: QuoteRequest) {
    if (!user) throw new Error('Entre na sua conta para publicar um pedido.');
    await createJobRequest(request, user.id);
    setNotice(`Pedido de ${request.category.toLowerCase()} publicado para profissionais em ${request.city}.`);
  }

  return (
    <View style={styles.screen}>
      <BrandHeader mode="hire" />
      <Page>
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>RIO GRANDE DO SUL · CONTRATEI</Text>
            <Text style={styles.heroTitle}>Encontre quem resolve. Perto de você.</Text>
            <Text style={styles.heroText}>Descreva o que precisa e receba propostas de profissionais com identidade verificada.</Text>
            <View style={styles.heroActions}>
              <Pressable accessibilityRole="button" onPress={() => openRequest()} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>＋ Solicitar orçamento</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => router.push('/work')} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Quero trabalhar</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.promiseCard}>
            <View style={styles.promiseTop}>
              <View style={styles.promiseMark}><Text style={styles.promiseCheck}>✓</Text></View>
              <Text style={styles.promiseCaption}>CONFIANÇA EM CADA ETAPA</Text>
            </View>
            <Text style={styles.promiseTitle}>Serviços de verdade. Pessoas verificadas.</Text>
            <Text style={styles.promiseText}>Compare propostas, preços e requisitos com clareza antes de escolher.</Text>
            <View style={styles.promiseStats}>
              <View><Text style={styles.statValue}>RS</Text><Text style={styles.statLabel}>lançamento inicial</Text></View>
              <View><Text style={styles.statValue}>10%</Text><Text style={styles.statLabel}>comissão transparente</Text></View>
              <Pressable onPress={() => router.push('/safety')} style={styles.lockButton}><Text style={styles.lockText}>🔒  Ver segurança</Text></Pressable>
            </View>
          </View>
        </View>

        {notice ? (
          <Pressable onPress={() => setNotice('')} style={styles.notice}>
            <Text style={styles.noticeText}>✓  {notice}</Text><Text style={styles.dismiss}>×</Text>
          </Pressable>
        ) : null}

        <View style={styles.searchRow}>
          <View style={styles.searchBox}><Text style={styles.searchIcon}>⌕</Text><TextInput onChangeText={setSearch} placeholder="Que serviço você procura?" placeholderTextColor="#87938E" style={styles.searchInput} value={search} /></View>
          <View style={styles.cityBox}><Text style={styles.pin}>⌖</Text><TextInput accessibilityLabel="Sua cidade" onChangeText={setCity} placeholder="Sua cidade" placeholderTextColor="#87938E" style={styles.cityInput} value={city} /></View>
        </View>

        <SectionTitle title="O que você precisa?" subtitle="Escolha uma categoria ou conte o que precisa no pedido de orçamento." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
          <CategoryChip label="Todas" icon="✦" active={category === 'Todas'} onPress={() => setCategory('Todas')} />
          {categories.map((item) => <CategoryChip key={item.name} label={item.name} icon={item.icon} active={category === item.name} onPress={() => setCategory(item.name)} />)}
        </ScrollView>

        <View style={styles.professionalsHeading}>
          <SectionTitle title="Profissionais verificados" subtitle="Perfis reais e serviços ativos no Rio Grande do Sul" />
          <Pressable onPress={() => router.push('/work')} style={styles.linkButton}><Text style={styles.linkText}>Ver pedidos →</Text></Pressable>
        </View>
        <View style={styles.profileGrid}>
          {professionals === null ? <Text style={styles.empty}>Carregando profissionais verificados…</Text> : visibleProfessionals.map((person) => (
            <View key={person.id} style={styles.professionalCard}>
              <View style={[styles.profileArt, { backgroundColor: person.color }]}><Text style={styles.profileIcon}>{person.icon}</Text><Text style={styles.profileCategory}>{person.category}</Text></View>
              <View style={styles.personHeading}><View style={styles.personAvatar}><Text style={styles.avatarText}>{person.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</Text></View><View style={{ flex: 1 }}><Text style={styles.personName}>{person.name}</Text><Text style={styles.personJob}>{person.title}</Text></View></View>
              <Text style={styles.personMeta}>✓ Identidade verificada · {person.city}, RS</Text>
              <View style={styles.professionalFooter}><Text style={styles.professionalPrice}>{person.priceLabel}</Text><Pressable onPress={() => openRequest(person.category)} style={styles.profileButton}><Text style={styles.profileButtonText}>Solicitar orçamento</Text></Pressable></View>
            </View>
          ))}
          {directoryError ? <Text style={styles.empty}>{directoryError}</Text> : null}
          {professionals?.length === 0 && !directoryError ? <View style={styles.directoryEmpty}><Text style={styles.emptyTitle}>A rede CONTRATEI está começando no RS</Text><Text style={styles.empty}>Ainda não há perfis profissionais publicados. Você já pode solicitar um orçamento e receber propostas de trabalhadores verificados.</Text><Pressable onPress={() => openRequest()} style={styles.profileButton}><Text style={styles.profileButtonText}>Publicar pedido</Text></Pressable></View> : null}
          {professionals && professionals.length > 0 && visibleProfessionals.length === 0 ? <Text style={styles.empty}>Nenhum profissional verificado corresponde a essa busca. Tente outra cidade ou categoria.</Text> : null}
        </View>

        <View style={styles.howCard}>
          <View style={styles.howStep}><Text style={styles.stepNumber}>1</Text><View><Text style={styles.stepTitle}>Conte o que precisa</Text><Text style={styles.stepText}>Só descrição ou descrição com fotos.</Text></View></View>
          <View style={styles.howStep}><Text style={styles.stepNumber}>2</Text><View><Text style={styles.stepTitle}>Compare propostas</Text><Text style={styles.stepText}>Preço, perfil e avaliações em um só lugar.</Text></View></View>
          <View style={styles.howStep}><Text style={styles.stepNumber}>3</Text><View><Text style={styles.stepTitle}>Acompanhe o pedido</Text><Text style={styles.stepText}>Veja o andamento e os valores no app.</Text></View></View>
        </View>
        <Text style={styles.disclaimer}>A verificação de identidade é feita manualmente. O CONTRATEI não confirma qualificações profissionais ou antecedentes.</Text>
      </Page>
      <QuoteRequestModal key={requestInitialCategory} initialCategory={requestInitialCategory} visible={requestOpen} onClose={() => setRequestOpen(false)} onSubmit={submitRequest} />
      <AuthModal visible={authOpen} onClose={() => setAuthOpen(false)} />
    </View>
  );
}

function CategoryChip({ label, icon, active, onPress }: { label: string; icon: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.categoryChip, active && styles.categoryChipActive]}><Text style={styles.chipIcon}>{icon}</Text><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: brand.background, flex: 1 },
  hero: { flexDirection: 'row', flexWrap: 'wrap', gap: 22, paddingTop: 28 },
  heroCopy: { flex: 1.08, minWidth: 285, paddingBottom: 10, paddingTop: 12 },
  eyebrow: { color: brand.orangeDark, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  heroTitle: { color: brand.ink, fontSize: 42, fontWeight: '900', letterSpacing: -2.1, lineHeight: 46, marginTop: 13, maxWidth: 600 },
  heroText: { color: brand.muted, fontSize: 15, lineHeight: 23, marginTop: 13, maxWidth: 530 },
  heroActions: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  primaryButton: { alignItems: 'center', backgroundColor: brand.orange, borderRadius: 12, minHeight: 47, justifyContent: 'center', paddingHorizontal: 16 },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  secondaryButton: { alignItems: 'center', backgroundColor: brand.orangeSoft, borderRadius: 12, minHeight: 47, justifyContent: 'center', paddingHorizontal: 16 },
  secondaryButtonText: { color: brand.orangeDark, fontSize: 13, fontWeight: '800' },
  promiseCard: { backgroundColor: brand.navy, borderRadius: 22, flex: 0.92, minHeight: 240, minWidth: 285, overflow: 'hidden', padding: 22 },
  promiseTop: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  promiseMark: { alignItems: 'center', backgroundColor: brand.yellow, borderRadius: 10, height: 27, justifyContent: 'center', width: 27 },
  promiseCheck: { color: brand.ink, fontSize: 15, fontWeight: '900' },
  promiseCaption: { color: brand.yellow, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  promiseTitle: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.6, lineHeight: 26, marginTop: 15, maxWidth: 320 },
  promiseText: { color: '#C7D4DA', fontSize: 12, lineHeight: 18, marginTop: 7, maxWidth: 330 },
  promiseStats: { alignItems: 'flex-end', flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 20 },
  statValue: { color: '#fff', fontSize: 19, fontWeight: '900' },
  statLabel: { color: '#C7D4DA', fontSize: 9, marginTop: 2 },
  lockButton: { backgroundColor: '#FFFFFF18', borderColor: '#FFFFFF30', borderRadius: 9, borderWidth: 1, marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 8 },
  lockText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  notice: { alignItems: 'center', backgroundColor: brand.successSoft, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, padding: 12 },
  noticeText: { color: brand.success, flex: 1, fontSize: 11, fontWeight: '700' },
  dismiss: { color: brand.success, fontSize: 18, paddingHorizontal: 5 },
  searchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 24 },
  searchBox: { alignItems: 'center', backgroundColor: '#fff', borderColor: brand.border, borderRadius: 12, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 9, minHeight: 47, minWidth: 240, paddingHorizontal: 13 },
  searchIcon: { color: brand.muted, fontSize: 22 },
  searchInput: { color: brand.ink, flex: 1, fontSize: 13 },
  cityBox: { alignItems: 'center', backgroundColor: '#fff', borderColor: brand.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 8, minHeight: 47, paddingHorizontal: 13, width: 220 },
  pin: { color: brand.orange, fontSize: 17 },
  cityInput: { color: brand.ink, flex: 1, fontSize: 13 },
  categoryList: { gap: 8, paddingBottom: 2 },
  categoryChip: { alignItems: 'center', backgroundColor: '#fff', borderColor: brand.border, borderRadius: 30, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 9 },
  categoryChipActive: { backgroundColor: brand.orange, borderColor: brand.orange },
  chipIcon: { fontSize: 13 },
  chipText: { color: '#52625D', fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  professionalsHeading: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  linkButton: { marginBottom: 17, padding: 6 },
  linkText: { color: brand.orangeDark, fontSize: 11, fontWeight: '800' },
  profileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 13, justifyContent: 'flex-start' },
  professionalCard: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 16, borderWidth: 1, flexGrow: 1, maxWidth: 365, minWidth: 270, padding: 14, width: '31%' },
  profileArt: { alignItems: 'flex-end', borderRadius: 12, flexDirection: 'row', height: 82, justifyContent: 'space-between', padding: 10 },
  profileIcon: { fontSize: 27 },
  profileCategory: { backgroundColor: '#FFFFFFC9', borderRadius: 20, color: brand.orangeDark, fontSize: 10, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5 },
  personHeading: { alignItems: 'center', flexDirection: 'row', gap: 9, marginTop: 12 },
  personAvatar: { alignItems: 'center', backgroundColor: '#EAF0E9', borderRadius: 20, height: 37, justifyContent: 'center', width: 37 },
  avatarText: { color: brand.navy, fontSize: 11, fontWeight: '800' },
  personName: { color: brand.ink, fontSize: 13, fontWeight: '800' },
  personJob: { color: brand.muted, fontSize: 10, marginTop: 2 },
  personMeta: { color: brand.success, fontSize: 9, fontWeight: '700', marginTop: 9 },
  professionalFooter: { alignItems: 'center', borderTopColor: brand.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10 },
  professionalPrice: { color: brand.ink, fontSize: 10, fontWeight: '700' },
  profileButton: { backgroundColor: brand.orangeSoft, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 8 },
  profileButtonText: { color: brand.orangeDark, fontSize: 9, fontWeight: '800' },
  empty: { color: brand.muted, fontSize: 13, paddingVertical: 20 },
  directoryEmpty: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 16, borderWidth: 1, maxWidth: 720, padding: 18 },
  emptyTitle: { color: brand.ink, fontSize: 15, fontWeight: '900' },
  howCard: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 17, borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'space-between', marginTop: 28, padding: 17 },
  howStep: { alignItems: 'center', flexDirection: 'row', flexGrow: 1, gap: 10, minWidth: 215 },
  stepNumber: { alignItems: 'center', backgroundColor: brand.orangeSoft, borderRadius: 18, color: brand.orangeDark, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 11, paddingVertical: 8, textAlign: 'center' },
  stepTitle: { color: brand.ink, fontSize: 11, fontWeight: '800' },
  stepText: { color: brand.muted, fontSize: 10, marginTop: 2 },
  disclaimer: { color: brand.muted, fontSize: 9, marginBottom: 14, marginTop: 16, textAlign: 'center' },
});
