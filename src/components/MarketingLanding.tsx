import { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { AuthModal } from '@/components/AuthModal';
import { brand, categories } from '@/constants/brand';

export function MarketingLanding() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [howOffset, setHowOffset] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);
  const wide = width >= 820;
  const exploreHref = '/explore' as Href;

  return (
    <View style={styles.screen}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerOuter}>
          <View style={[styles.header, !wide && styles.headerCompact]}>
            <Pressable accessibilityRole="link" accessibilityLabel="MOVA$ - página inicial" onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} style={styles.brand}>
              <Image source={require('../../assets/images/movas-icon-foreground.png')} style={styles.logo} resizeMode="contain" />
              <View>
                <Text style={styles.brandName}>MOVA<Text style={styles.brandMoney}>$</Text></Text>
                <Text style={styles.brandTagline}>Conectando quem precisa a quem faz</Text>
              </View>
            </Pressable>
            {wide ? <View style={styles.nav}>
              <Pressable onPress={() => scrollRef.current?.scrollTo({ y: howOffset, animated: true })} style={styles.navItem}><Text style={styles.navText}>Como funciona</Text></Pressable>
              <Pressable onPress={() => router.push('/safety')} style={styles.navItem}><Text style={styles.navText}>Segurança</Text></Pressable>
              <Pressable onPress={() => router.push('/work')} style={styles.navItem}><Text style={styles.navText}>Para profissionais</Text></Pressable>
            </View> : null}
            <Pressable accessibilityRole="button" onPress={() => setAuthOpen(true)} style={styles.loginButton}><Text style={styles.loginText}>Entrar</Text></Pressable>
          </View>
        </View>

        <View style={styles.heroOuter}>
          <View style={[styles.hero, wide && styles.heroWide]}>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>SERVIÇOS LOCAIS · RIO GRANDE DO SUL</Text>
              <Text style={[styles.heroTitle, !wide && styles.heroTitleCompact]}>Tem algo para fazer. Tem alguém que sabe fazer.</Text>
              <Text style={styles.heroText}>Peça um serviço com uma descrição ou fotos. Profissionais da sua região podem enviar propostas para você comparar.</Text>
              <View style={styles.heroActions}>
                <Pressable accessibilityRole="button" onPress={() => router.push(exploreHref)} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Encontrar um profissional <Text style={styles.arrow}>→</Text></Text></Pressable>
                <Pressable accessibilityRole="button" onPress={() => router.push('/work')} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Oferecer meu trabalho</Text></Pressable>
              </View>
              <Text style={styles.heroNote}>Começamos pelo Rio Grande do Sul.</Text>
            </View>
            <View style={[styles.heroIndex, !wide && styles.heroIndexCompact]}>
              <Text style={styles.indexLabel}>O QUE VOCÊ PRECISA?</Text>
              {categories.slice(0, 6).map((item, index) => <Pressable key={item.name} onPress={() => router.push(exploreHref)} style={styles.indexRow}>
                <Text style={styles.indexNumber}>0{index + 1}</Text><Text style={styles.indexName}>{item.name}</Text><Text style={styles.indexArrow}>↗</Text>
              </Pressable>)}
              <Pressable onPress={() => router.push(exploreHref)} style={styles.allServices}><Text style={styles.allServicesText}>Ver serviços e profissionais <Text style={styles.arrow}>→</Text></Text></Pressable>
            </View>
          </View>
        </View>

        <View style={styles.promiseOuter}>
          <View style={[styles.promise, !wide && styles.promiseCompact]}>
            <Text style={styles.promiseLead}>Um pedido claro ajuda a encontrar a pessoa certa.</Text>
            <Text style={styles.promiseBody}>No MOVA$, quem contrata descreve o serviço e recebe propostas. Quem trabalha apresenta preço e condições antes da escolha.</Text>
          </View>
        </View>

        <View onLayout={(event) => setHowOffset(event.nativeEvent.layout.y)} style={styles.howOuter}>
          <View style={styles.sectionTop}>
            <Text style={styles.eyebrow}>DO PEDIDO À ESCOLHA</Text>
            <Text style={styles.sectionTitle}>Três passos para combinar o trabalho.</Text>
          </View>
          <View style={[styles.steps, !wide && styles.stepsCompact]}>
            <Step number="01" title="Conte o que precisa" text="Escreva uma descrição e adicione fotos se elas ajudarem a explicar o serviço." />
            <Step number="02" title="Compare propostas" text="Veja preço, perfil, requisitos e condições apresentadas por cada profissional." />
            <Step number="03" title="Converse e combine" text="Tire dúvidas e alinhe os detalhes antes de decidir como seguir." />
          </View>
        </View>

        <View style={styles.audienceOuter}>
          <View style={[styles.audience, !wide && styles.audienceCompact]}>
            <View style={styles.audienceIntro}>
              <Text style={styles.eyebrow}>FEITO PARA DOIS LADOS</Text>
              <Text style={styles.audienceTitle}>Um lugar para pedir ajuda ou encontrar trabalho.</Text>
            </View>
            <View style={styles.audienceColumn}>
              <Text style={styles.audienceIndex}>01 / CONTRATANTES</Text>
              <Text style={styles.audienceHead}>Resolva o que está na sua lista.</Text>
              <Text style={styles.audienceText}>Publique seu pedido com fotos ou apenas uma descrição. Receba propostas e escolha com mais informação.</Text>
              <Pressable onPress={() => router.push(exploreHref)} style={styles.textAction}><Text style={styles.textActionText}>Pedir um orçamento <Text style={styles.arrow}>→</Text></Text></Pressable>
            </View>
            <View style={styles.audienceColumn}>
              <Text style={styles.audienceIndex}>02 / PROFISSIONAIS</Text>
              <Text style={styles.audienceHead}>Mostre o que você faz.</Text>
              <Text style={styles.audienceText}>Apresente seus serviços, defina seu preço e responda a pedidos que combinam com sua experiência.</Text>
              <Pressable onPress={() => router.push('/work')} style={styles.textAction}><Text style={styles.textActionText}>Ver oportunidades <Text style={styles.arrow}>→</Text></Text></Pressable>
            </View>
          </View>
        </View>

        <View style={styles.safetyOuter}>
          <View style={[styles.safety, !wide && styles.safetyCompact]}>
            <Text style={styles.safetyNumber}>03</Text>
            <View style={styles.safetyCopy}>
              <Text style={styles.eyebrow}>SEGURANÇA COM TRANSPARÊNCIA</Text>
              <Text style={styles.safetyTitle}>Verificar a identidade não é certificar o serviço.</Text>
              <Text style={styles.safetyText}>A equipe do MOVA$ revisa manualmente a identidade dos profissionais. Essa análise não confirma formação técnica, antecedentes ou a qualidade futura do trabalho. Confira as informações e combine os detalhes antes de contratar.</Text>
              <Pressable onPress={() => router.push('/safety')} style={styles.textAction}><Text style={styles.textActionText}>Leia as orientações de segurança <Text style={styles.arrow}>→</Text></Text></Pressable>
            </View>
          </View>
        </View>

        <View style={styles.finalOuter}>
          <View style={[styles.final, !wide && styles.finalCompact]}>
            <View style={{ flex: 1 }}><Text style={styles.eyebrow}>MOVA$ · RIO GRANDE DO SUL</Text><Text style={styles.finalTitle}>Qual trabalho você quer colocar em movimento?</Text></View>
            <View style={styles.finalActions}>
              <Pressable onPress={() => router.push(exploreHref)} style={styles.finalPrimary}><Text style={styles.finalPrimaryText}>Preciso contratar <Text style={styles.arrow}>→</Text></Text></Pressable>
              <Pressable onPress={() => router.push('/work')} style={styles.finalSecondary}><Text style={styles.finalSecondaryText}>Quero trabalhar <Text style={styles.arrow}>→</Text></Text></Pressable>
            </View>
          </View>
        </View>

        <View style={styles.footerOuter}>
          <View style={[styles.footer, !wide && styles.footerCompact]}>
            <View><Text style={styles.footerBrand}>MOVA<Text style={{ color: brand.orange }}>$</Text></Text><Text style={styles.footerTagline}>Conectando quem precisa a quem faz.</Text></View>
            <Text style={styles.footerNote}>O MOVA$ aproxima contratantes e profissionais independentes. A revisão de identidade não é certificação técnica nem verificação de antecedentes.</Text>
            <View style={styles.footerLinks}>
              <Pressable onPress={() => router.push('/safety')}><Text style={styles.footerLink}>Segurança</Text></Pressable>
              <Pressable onPress={() => setAuthOpen(true)}><Text style={styles.footerLink}>Entrar ou criar conta</Text></Pressable>
              <Pressable onPress={() => router.push('/work')}><Text style={styles.footerLink}>Para profissionais</Text></Pressable>
            </View>
            <Text style={styles.copyright}>© 2026 MOVA$</Text>
          </View>
        </View>
      </ScrollView>
      <AuthModal visible={authOpen} onClose={() => setAuthOpen(false)} />
    </View>
  );
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return <View style={styles.step}><Text style={styles.stepNumber}>{number}</Text><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepText}>{text}</Text></View>;
}

const ink = '#292B28';
const paper = '#F4F1E9';
const line = '#C9C5BA';

const styles = StyleSheet.create({
  screen: { backgroundColor: paper, flex: 1 }, scrollContent: { paddingBottom: 0 },
  headerOuter: { backgroundColor: paper, borderBottomColor: line, borderBottomWidth: 1, width: '100%' },
  header: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', maxWidth: 1260, minHeight: 76, paddingHorizontal: 42, width: '100%' },
  headerCompact: { minHeight: 68, paddingHorizontal: 20 },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 10 }, logo: { height: 36, width: 36 }, brandName: { color: ink, fontSize: 20, fontWeight: '800', letterSpacing: 0.4 }, brandMoney: { color: brand.orange }, brandTagline: { color: '#686961', fontSize: 9, marginTop: 2 },
  nav: { alignItems: 'center', flexDirection: 'row', gap: 35, marginLeft: 'auto', marginRight: 38 }, navItem: { paddingVertical: 12 }, navText: { color: ink, fontSize: 12, fontWeight: '600' },
  loginButton: { borderColor: ink, borderWidth: 1, justifyContent: 'center', minHeight: 38, paddingHorizontal: 19 }, loginText: { color: ink, fontSize: 12, fontWeight: '700' },
  heroOuter: { backgroundColor: paper, paddingHorizontal: 42, paddingTop: 52, paddingBottom: 63, width: '100%' }, hero: { alignSelf: 'center', maxWidth: 1176, width: '100%' }, heroWide: { alignItems: 'center', flexDirection: 'row', gap: 90, minHeight: 490 }, heroCopy: { flex: 1.1, paddingVertical: 35 }, eyebrow: { color: '#68705D', fontSize: 9, fontWeight: '800', letterSpacing: 1.55 }, heroTitle: { color: ink, fontFamily: 'Georgia', fontSize: 62, fontWeight: '400', letterSpacing: -2.7, lineHeight: 68, marginTop: 24, maxWidth: 670 }, heroTitleCompact: { fontSize: 43, letterSpacing: -1.5, lineHeight: 48 }, heroText: { color: '#555750', fontSize: 15, lineHeight: 25, marginTop: 19, maxWidth: 520 },
  heroActions: { alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 28 }, primaryButton: { backgroundColor: '#C75B35', justifyContent: 'center', minHeight: 50, paddingHorizontal: 19 }, primaryButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' }, arrow: { fontSize: 15 }, secondaryButton: { borderColor: '#96958B', borderWidth: 1, justifyContent: 'center', minHeight: 50, paddingHorizontal: 17 }, secondaryButtonText: { color: ink, fontSize: 12, fontWeight: '700' }, heroNote: { color: '#717168', fontSize: 11, marginTop: 16 },
  heroIndex: { borderTopColor: ink, borderTopWidth: 1, flex: 0.75, maxWidth: 390, minWidth: 285, paddingTop: 15, width: '100%' }, heroIndexCompact: { alignSelf: 'flex-start', marginTop: 28, maxWidth: 500, minWidth: 0 }, indexLabel: { color: '#717168', fontSize: 9, fontWeight: '700', letterSpacing: 1.3, marginBottom: 8 }, indexRow: { alignItems: 'center', borderBottomColor: line, borderBottomWidth: 1, flexDirection: 'row', minHeight: 46 }, indexNumber: { color: '#8A8A80', fontFamily: 'Georgia', fontSize: 13, width: 41 }, indexName: { color: ink, flex: 1, fontFamily: 'Georgia', fontSize: 17 }, indexArrow: { color: '#77786F', fontSize: 14 }, allServices: { alignSelf: 'flex-start', paddingVertical: 17 }, allServicesText: { color: '#A8492B', fontSize: 11, fontWeight: '700' },
  promiseOuter: { backgroundColor: '#E9E5DA', paddingHorizontal: 42, paddingVertical: 29 }, promise: { alignSelf: 'center', flexDirection: 'row', gap: 50, maxWidth: 1176, width: '100%' }, promiseCompact: { flexDirection: 'column', gap: 12 }, promiseLead: { color: ink, flex: 0.9, fontFamily: 'Georgia', fontSize: 22, lineHeight: 29 }, promiseBody: { color: '#5B5C54', flex: 1, fontSize: 12, lineHeight: 20, maxWidth: 520 },
  howOuter: { alignSelf: 'center', maxWidth: 1260, paddingHorizontal: 42, paddingTop: 77, paddingBottom: 82, width: '100%' }, sectionTop: { borderBottomColor: line, borderBottomWidth: 1, paddingBottom: 23 }, sectionTitle: { color: ink, fontFamily: 'Georgia', fontSize: 36, fontWeight: '400', letterSpacing: -0.8, lineHeight: 43, marginTop: 11, maxWidth: 670 }, steps: { flexDirection: 'row', gap: 36, marginTop: 30 }, stepsCompact: { flexDirection: 'column', gap: 0 }, step: { borderTopColor: '#89907F', borderTopWidth: 2, flex: 1, paddingTop: 14, paddingBottom: 18 }, stepNumber: { color: '#A8492B', fontSize: 10, fontWeight: '700', letterSpacing: 1 }, stepTitle: { color: ink, fontFamily: 'Georgia', fontSize: 19, marginTop: 17 }, stepText: { color: '#5B5C54', fontSize: 12, lineHeight: 19, marginTop: 9, maxWidth: 300 },
  audienceOuter: { backgroundColor: '#2C302C', paddingHorizontal: 42, paddingVertical: 65 }, audience: { alignSelf: 'center', flexDirection: 'row', gap: 48, maxWidth: 1176, width: '100%' }, audienceCompact: { flexDirection: 'column', gap: 32 }, audienceIntro: { flex: 1.05, maxWidth: 350 }, audienceIntroTitle: { color: '#F4F1E9' }, audienceTitle: { color: '#F4F1E9', fontFamily: 'Georgia', fontSize: 34, lineHeight: 41, marginTop: 15 }, audienceColumn: { borderTopColor: '#73786D', borderTopWidth: 1, flex: 0.9, paddingTop: 16 }, audienceIndex: { color: '#C8A88F', fontSize: 9, fontWeight: '700', letterSpacing: 1.3 }, audienceHead: { color: '#F4F1E9', fontFamily: 'Georgia', fontSize: 23, lineHeight: 28, marginTop: 22 }, audienceText: { color: '#D0D0C7', fontSize: 12, lineHeight: 20, marginTop: 12, maxWidth: 330 }, textAction: { alignSelf: 'flex-start', marginTop: 18, paddingVertical: 5 }, textActionText: { color: '#E5A17C', fontSize: 11, fontWeight: '700' },
  safetyOuter: { paddingHorizontal: 42, paddingVertical: 70 }, safety: { alignSelf: 'center', borderBottomColor: line, borderBottomWidth: 1, borderTopColor: line, borderTopWidth: 1, flexDirection: 'row', gap: 35, maxWidth: 1176, paddingVertical: 25, width: '100%' }, safetyCompact: { gap: 15 }, safetyNumber: { color: '#A8492B', fontFamily: 'Georgia', fontSize: 22 }, safetyCopy: { flex: 1 }, safetyTitle: { color: ink, fontFamily: 'Georgia', fontSize: 30, lineHeight: 36, marginTop: 12, maxWidth: 690 }, safetyText: { color: '#5B5C54', fontSize: 12, lineHeight: 20, marginTop: 12, maxWidth: 700 },
  finalOuter: { backgroundColor: '#D8DDD2', paddingHorizontal: 42, paddingVertical: 36 }, final: { alignSelf: 'center', alignItems: 'center', flexDirection: 'row', gap: 40, maxWidth: 1176, width: '100%' }, finalCompact: { alignItems: 'flex-start', flexDirection: 'column', gap: 22 }, finalTitle: { color: ink, fontFamily: 'Georgia', fontSize: 31, lineHeight: 38, marginTop: 10, maxWidth: 560 }, finalActions: { alignItems: 'flex-start', gap: 10 }, finalPrimary: { backgroundColor: '#C75B35', minWidth: 208, paddingHorizontal: 16, paddingVertical: 14 }, finalPrimaryText: { color: '#fff', fontSize: 11, fontWeight: '700' }, finalSecondary: { borderColor: '#7E8277', borderWidth: 1, minWidth: 208, paddingHorizontal: 16, paddingVertical: 13 }, finalSecondaryText: { color: ink, fontSize: 11, fontWeight: '700' },
  footerOuter: { backgroundColor: paper, paddingHorizontal: 42, paddingTop: 31, paddingBottom: 24 }, footer: { alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 25, maxWidth: 1176, width: '100%' }, footerCompact: { flexDirection: 'column', gap: 16 }, footerBrand: { color: ink, fontSize: 19, fontWeight: '800', letterSpacing: 0.5 }, footerTagline: { color: '#64655D', fontSize: 10, marginTop: 4 }, footerNote: { color: '#6A6B63', flex: 1, fontSize: 9, lineHeight: 15, maxWidth: 390 }, footerLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 }, footerLink: { color: ink, fontSize: 10, fontWeight: '600' }, copyright: { borderTopColor: line, borderTopWidth: 1, color: '#77786F', fontSize: 9, paddingTop: 12, width: '100%' },
});

