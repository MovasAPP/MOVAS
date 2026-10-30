import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BrandHeader } from '@/components/BrandHeader';
import { JobCard, type Job } from '@/components/JobCard';
import { Page } from '@/components/Page';
import { ProposalModal } from '@/components/ProposalModal';
import { AuthModal } from '@/components/AuthModal';
import { SectionTitle } from '@/components/SectionTitle';
import { brand, categories } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { createProposal, getOpenJobs } from '@/lib/marketplace';

export default function WorkScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [city, setCity] = useState('Porto Alegre');
  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [notice, setNotice] = useState('');
  const [jobs, setJobs] = useState<Job[] | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) {
      return () => { active = false; };
    }
    void getOpenJobs(user.id).then((nextJobs) => {
      if (active) setJobs(nextJobs);
    }).catch((error: unknown) => {
      if (active) {
        setJobs([]);
        setNotice(error instanceof Error ? error.message : 'Não foi possível carregar os pedidos.');
      }
    });
    return () => { active = false; };
  }, [user]);

  const filteredJobs = useMemo(() => (user ? jobs ?? [] : []).filter((job) => {
    const categoryMatch = activeCategory === 'Todas' || activeCategory === job.category;
    const searchMatch = !search || `${job.title} ${job.city} ${job.category}`.toLowerCase().includes(search.toLowerCase());
    const cityMatch = !city || job.city.toLowerCase().includes(city.toLowerCase()) || city.toLowerCase().includes('rs');
    return categoryMatch && searchMatch && cityMatch;
  }), [activeCategory, city, search, jobs, user]);

  async function submitProposal(job: Job, amount: number, message: string) {
    if (!user) throw new Error('Entre na sua conta para enviar uma proposta.');
    await createProposal(job.id, user.id, amount, message);
    setNotice(`Proposta enviada para “${job.title}”.`);
  }

  function selectJob(job: Job) {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setSelectedJob(job);
  }

  return (
    <View style={styles.screen}>
      <BrandHeader mode="work" />
      <Page>
        <View style={styles.header}>
          <View style={styles.headerRow}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>MODO PROFISSIONAL</Text><Text style={styles.title}>Oportunidades para você</Text><Text style={styles.subtitle}>Encontre serviços na sua região e envie uma proposta.</Text></View><Pressable onPress={() => router.push('/my-proposals')} style={styles.myProposalsButton}><Text style={styles.myProposalsButtonText}>Minhas propostas →</Text></Pressable></View>
        </View>
        <View style={styles.verificationBanner}>
          <View style={styles.verificationIcon}><Text>✓</Text></View>
          <View style={styles.verificationCopy}><Text style={styles.verificationTitle}>Perfil verificado ganha confiança</Text><Text style={styles.verificationSubtitle}>Complete sua verificação para se candidatar aos trabalhos.</Text></View>
          <Pressable onPress={() => router.push('/profile')} style={styles.bannerButton}><Text style={styles.bannerButtonText}>Meu perfil</Text></Pressable>
        </View>
        {notice ? <Pressable onPress={() => setNotice('')} style={styles.notice}><Text style={styles.noticeText}>{notice}</Text><Text style={styles.dismiss}>×</Text></Pressable> : null}
        <View style={styles.filters}>
          <TextInput onChangeText={setSearch} placeholder="Buscar serviço" placeholderTextColor="#87938E" style={styles.search} value={search} />
          <TextInput accessibilityLabel="Filtrar por cidade" onChangeText={setCity} placeholder="Cidade" placeholderTextColor="#87938E" style={styles.city} value={city} />
        </View>
        <View style={styles.categories}>
          <Filter label="Todas" active={activeCategory === 'Todas'} onPress={() => setActiveCategory('Todas')} />
          {categories.map((item) => <Filter key={item.name} label={item.name} active={activeCategory === item.name} onPress={() => setActiveCategory(item.name)} />)}
        </View>
        <SectionTitle title="Pedidos de orçamento" subtitle={`${user && jobs === null ? 'Buscando pedidos…' : `${filteredJobs.length} pedidos encontrados perto de ${city || 'você'}.`}`} />
        <View style={styles.jobGrid}>
          {filteredJobs.map((job) => <JobCard key={job.id} job={job} actionLabel="Enviar proposta" onAction={selectJob} />)}
          {!(user && jobs === null) && !filteredJobs.length ? <Text style={styles.empty}>{user ? 'Ainda não há pedidos reais para esse filtro. Amplie a cidade ou escolha outra categoria.' : 'Entre na sua conta para ver pedidos publicados na plataforma.'}</Text> : null}
        </View>
        <Text style={styles.disclaimer}>Os pedidos publicados aparecem aqui. Para enviar propostas, seu perfil profissional precisa estar verificado.</Text>
      </Page>
      <ProposalModal key={selectedJob?.id ?? 'closed'} job={selectedJob} onClose={() => setSelectedJob(null)} onSubmit={submitProposal} />
      <AuthModal visible={authOpen} onClose={() => setAuthOpen(false)} />
    </View>
  );
}

function Filter({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: brand.background, flex: 1 },
  header: { paddingTop: 30 },
  headerRow: { alignItems: 'flex-end', flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  myProposalsButton: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 10, borderWidth: 1, marginBottom: 5, paddingHorizontal: 11, paddingVertical: 9 },
  myProposalsButtonText: { color: brand.orangeDark, fontSize: 10, fontWeight: '900' },
  eyebrow: { color: brand.orangeDark, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: brand.ink, fontSize: 36, fontWeight: '900', letterSpacing: -1.5, marginTop: 8 },
  subtitle: { color: brand.muted, fontSize: 13, marginTop: 5 },
  verificationBanner: { alignItems: 'center', backgroundColor: '#FFF2E8', borderColor: '#F2DCCF', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 11, marginTop: 20, padding: 13 },
  verificationIcon: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 19, height: 37, justifyContent: 'center', width: 37 },
  verificationCopy: { flex: 1 },
  verificationTitle: { color: brand.ink, fontSize: 11, fontWeight: '800' },
  verificationSubtitle: { color: brand.muted, fontSize: 9, marginTop: 3 },
  bannerButton: { backgroundColor: brand.orangeDark, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 9 },
  bannerButtonText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  notice: { alignItems: 'center', backgroundColor: brand.successSoft, borderRadius: 10, flexDirection: 'row', gap: 8, justifyContent: 'space-between', marginTop: 13, padding: 11 },
  noticeText: { color: brand.success, flex: 1, fontSize: 10, fontWeight: '700', lineHeight: 15 },
  dismiss: { color: brand.success, fontSize: 18 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 20 },
  search: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 11, borderWidth: 1, color: brand.ink, flex: 1, fontSize: 12, minHeight: 44, minWidth: 190, paddingHorizontal: 12 },
  city: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 11, borderWidth: 1, color: brand.ink, fontSize: 12, minHeight: 44, paddingHorizontal: 12, width: 195 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13 },
  filterChip: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 99, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 },
  filterChipActive: { backgroundColor: brand.orangeDark, borderColor: brand.orange },
  filterText: { color: '#52625D', fontSize: 10, fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  jobGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 13 },
  empty: { color: brand.muted, fontSize: 13, paddingVertical: 15 },
  disclaimer: { color: brand.muted, fontSize: 9, marginBottom: 16, marginTop: 16, textAlign: 'center' },
});
