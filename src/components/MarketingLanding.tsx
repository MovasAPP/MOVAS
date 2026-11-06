import { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthModal } from '@/components/AuthModal';
import { brand, categories } from '@/constants/brand';

export function MarketingLanding() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [howOffset, setHowOffset] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);
  const wide = width >= 820;

  return (
    <View style={styles.screen}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerOuter}>
          <View style={styles.header}>
            <Pressable accessibilityRole="link" accessibilityLabel="MOVA$ - página inicial" onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} style={styles.brand}>
              <Image source={require('../../assets/images/movas-icon-foreground.png')} style={styles.logo} resizeMode="contain" />
              <View>
                <Text style={styles.brandName}>MOVA<Text style={styles.brandMoney}>$</Text></Text>
                <Text style={styles.brandTagline}>Conectando quem precisa a quem faz</Text>
              </View>
            </Pressable>
            {wide ? (
              <View style={styles.nav}>
                <Pressable onPress={() => scrollRef.current?.scrollTo({ y: howOffset, animated: true })} style={styles.navItem}><Text style={styles.navText}>Como funciona</Text></Pressable>
                <Pressable onPress={() => router.push('/safety')} style={styles.navItem}><Text style={styles.navText}>Segurança</Text></Pressable>
                <Pressable onPress={() => router.push('/work')} style={styles.navItem}><Text style={styles.navText}>Quero trabalhar</Text></Pressable>
              </View>
            ) : null}
            <Pressable accessibilityRole="button" onPress={() => setAuthOpen(true)} style={styles.loginButton}>
              <Text style={styles.loginText}>Entrar</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.heroOuter}>
          <View style={[styles.hero, wide && styles.heroWide]}>
            <View style={[styles.heroCopy, wide && styles.heroCopyWide]}>
              <View style={styles.eyebrowPill}><View style={styles.liveDot} /><Text style={styles.eyebrow}>COMEÇANDO PELO RIO GRANDE DO SUL</Text></View>
              <Text style={[styles.heroTitle, !wide && styles.heroTitleCompact]}>O trabalho que você precisa. A pessoa certa para fazer.</Text>
              <Text style={styles.heroText}>No MOVA$, você publica o que precisa com uma descrição ou fotos, recebe propostas e encontra profissionais da sua região.</Text>
              <View style={styles.heroActions}>
                <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/', params: { view: 'explore' } })} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Quero contratar <Text style={styles.buttonArrow}>→</Text></Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => router.push('/work')} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Quero trabalhar</Text>
                </Pressable>
              </View>
              <Text style={styles.heroNote}>Um só lugar para pedir um serviço ou oferecer seu trabalho.</Text>
            </View>

            <View style={[styles.illustration, !wide && styles.illustrationCompact]}>
              <View style={styles.orbGreen} />
              <View style={styles.orbOrange} />
              <View style={styles.workCard}>
                <View style={styles.workCardTop}><Text style={styles.workCardLabel}>EXEMPLO DE PEDIDO</Text><Text style={styles.workCardIcon}>⌂</Text></View>
                <Text style={styles.workCardTitle}>Instalação em casa</Text>
                <Text style={styles.workCardDescription}>Conte o que precisa e receba propostas.</Text>
                <View style={styles.workDivider} />
                <View style={styles.proposalRow}><View style={styles.avatar}><Text style={styles.avatarText}>P</Text></View><View style={styles.proposalCopy}><Text style={styles.proposalName}>Profissional da região</Text><Text style={styles.proposalMeta}>Proposta enviada</Text></View><Text style={styles.checkMark}>✓</Text></View>
                <View style={styles.workCardFooter}><Text style={styles.footerDot} /><Text style={styles.workCardFooterText}>Você compara antes de decidir</Text></View>
              </View>
              <View style={styles.floatingBadge}><Text style={styles.badgeIcon}>✦</Text><Text style={styles.badgeText}>Seu próximo serviço começa aqui</Text></View>
            </View>
          </View>
        </View>

        <View style={styles.quickFactsOuter}>
          <View style={[styles.quickFacts, !wide && styles.quickFactsCompact]}>
            <QuickFact icon="01" title="Descreva" text="Explique o que precisa ser feito." />
            <QuickFact icon="02" title="Receba propostas" text="Veja opções de profissionais." />
            <QuickFact icon="03" title="Escolha com clareza" text="Compare as informações antes de seguir." />
          </View>
        </View>

        <View onLayout={(event) => setHowOffset(event.nativeEvent.layout.y)} style={styles.sectionOuter}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionEyebrow}>SIMPLES PARA OS DOIS LADOS</Text>
            <Text style={styles.sectionTitle}>Uma forma mais fácil de encontrar e oferecer serviços.</Text>
            <Text style={styles.sectionIntro}>O MOVA$ aproxima quem precisa de ajuda de quem está pronto para trabalhar.</Text>
          </View>
          <View style={[styles.audienceGrid, !wide && styles.audienceGridCompact]}>
            <View style={styles.audienceCard}>
              <View style={[styles.audienceIcon, styles.customerIcon]}><Text style={styles.audienceEmoji}>⌕</Text></View>
              <Text style={styles.audienceKicker}>PARA CONTRATANTES</Text>
              <Text style={styles.audienceTitle}>Resolva o que está na sua lista.</Text>
              <Text style={styles.audienceText}>Publique seu pedido com fotos ou só uma descrição. Receba propostas e veja os detalhes para escolher com mais informação.</Text>
              <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/', params: { view: 'explore' } })} style={styles.textAction}><Text style={styles.textActionText}>Encontrar profissionais <Text style={styles.buttonArrow}>→</Text></Text></Pressable>
            </View>
            <View style={[styles.audienceCard, styles.workerCard]}>
              <View style={[styles.audienceIcon, styles.workerIcon]}><Text style={styles.audienceEmoji}>↗</Text></View>
              <Text style={styles.audienceKicker}>PARA PROFISSIONAIS</Text>
              <Text style={styles.audienceTitle}>Encontre oportunidades de trabalho.</Text>
              <Text style={styles.audienceText}>Crie seu perfil, apresente seus serviços e responda a pedidos que combinam com o que você faz.</Text>
              <Pressable accessibilityRole="button" onPress={() => router.push('/work')} style={styles.textAction}><Text style={styles.textActionText}>Ver oportunidades <Text style={styles.buttonArrow}>→</Text></Text></Pressable>
            </View>
          </View>
        </View>

        <View style={styles.howOuter}>
          <View style={styles.howSection}>
            <Text style={styles.sectionEyebrow}>COMO FUNCIONA</Text>
            <Text style={styles.sectionTitle}>Do pedido à proposta, sem complicação.</Text>
            <View style={[styles.stepsGrid, !wide && styles.stepsGridCompact]}>
              <Step number="1" title="Conte o que precisa" text="Escreva uma descrição e, se ajudar, envie fotos do serviço." />
              <Step number="2" title="Receba propostas" text="Profissionais podem responder com preço, experiência e condições." />
              <Step number="3" title="Compare e combine" text="Veja as informações disponíveis e decida como seguir." />
            </View>
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/', params: { view: 'explore' } })} style={styles.howButton}><Text style={styles.howButtonText}>Começar agora <Text style={styles.buttonArrow}>→</Text></Text></Pressable>
          </View>
        </View>

        <View style={styles.categoriesOuter}>
          <View style={styles.categoriesSection}>
            <Text style={styles.sectionEyebrow}>VÁRIOS TIPOS DE SERVIÇO</Text>
            <Text style={styles.sectionTitle}>O que você precisa fazer hoje?</Text>
            <Text style={styles.sectionIntro}>Encontre pedidos e serviços em diferentes categorias.</Text>
            <View style={styles.categoryGrid}>
              {categories.map((item) => (
                <Pressable key={item.name} onPress={() => router.push({ pathname: '/', params: { view: 'explore' } })} style={styles.categoryChip}>
                  <Text style={styles.categoryIcon}>{item.icon}</Text><Text style={styles.categoryName}>{item.name}</Text><Text style={styles.categoryArrow}>↗</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.trustOuter}>
          <View style={[styles.trustCard, wide && styles.trustCardWide]}>
            <View style={styles.trustMark}><Text style={styles.trustMarkText}>✓</Text></View>
            <View style={styles.trustCopy}>
              <Text style={styles.sectionEyebrow}>SEGURANÇA COM TRANSPARÊNCIA</Text>
              <Text style={styles.trustTitle}>Saiba o que é verificado — e o que não é.</Text>
              <Text style={styles.trustText}>A identidade dos profissionais que passam pela revisão do MOVA$ é conferida manualmente. Isso não valida qualificações técnicas, antecedentes ou a qualidade futura do serviço. Leia as informações e combine os detalhes antes de contratar.</Text>
              <Pressable onPress={() => router.push('/safety')} style={styles.textAction}><Text style={styles.textActionText}>Conhecer as orientações de segurança <Text style={styles.buttonArrow}>→</Text></Text></Pressable>
            </View>
          </View>
        </View>

        <View style={styles.finalOuter}>
          <View style={[styles.finalCard, wide && styles.finalCardWide]}>
            <View style={{ flex: 1 }}><Text style={styles.finalEyebrow}>MOVA$ · RIO GRANDE DO SUL</Text><Text style={styles.finalTitle}>Vamos tirar seu próximo trabalho do papel?</Text></View>
            <View style={styles.finalActions}>
              <Pressable onPress={() => router.push({ pathname: '/', params: { view: 'explore' } })} style={styles.finalPrimary}><Text style={styles.finalPrimaryText}>Encontrar um serviço →</Text></Pressable>
              <Pressable onPress={() => router.push('/work')} style={styles.finalSecondary}><Text style={styles.finalSecondaryText}>Oferecer meu trabalho</Text></Pressable>
            </View>
          </View>
        </View>

        <View style={styles.footerOuter}>
          <View style={styles.footer}>
            <Text style={styles.footerBrand}>MOVA<Text style={{ color: brand.orange }}>$</Text></Text>
            <Text style={styles.footerTagline}>Conectando quem precisa a quem faz.</Text>
            <Text style={styles.footerNote}>O MOVA$ facilita o contato entre contratantes e profissionais. A revisão de identidade não é certificação técnica nem verificação de antecedentes.</Text>
            <View style={styles.footerLinks}>
              <Pressable onPress={() => router.push('/safety')}><Text style={styles.footerLink}>Segurança</Text></Pressable>
              <Pressable onPress={() => setAuthOpen(true)}><Text style={styles.footerLink}>Entrar ou criar conta</Text></Pressable>
              <Pressable onPress={() => router.push('/work')}><Text style={styles.footerLink}>Trabalhar com MOVA$</Text></Pressable>
            </View>
            <Text style={styles.copyright}>© 2026 MOVA$</Text>
          </View>
        </View>
      </ScrollView>
      <AuthModal visible={authOpen} onClose={() => setAuthOpen(false)} />
    </View>
  );
}

function QuickFact({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <View style={styles.fact}><View style={styles.factNumber}><Text style={styles.factNumberText}>{icon}</Text></View><View style={{ flex: 1 }}><Text style={styles.factTitle}>{title}</Text><Text style={styles.factText}>{text}</Text></View></View>;
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return <View style={styles.stepCard}><Text style={styles.stepNumber}>{number}</Text><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: brand.background, flex: 1 },
  scrollContent: { paddingBottom: 0 },
  headerOuter: { backgroundColor: '#fff', borderBottomColor: brand.border, borderBottomWidth: 1, width: '100%' },
  header: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', maxWidth: 1180, minHeight: 78, paddingHorizontal: 24, paddingVertical: 10, width: '100%' },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  logo: { height: 44, width: 44 },
  brandName: { color: brand.navy, fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  brandMoney: { color: brand.orangeDark },
  brandTagline: { color: brand.muted, fontSize: 9, fontWeight: '600', marginTop: 2 },
  nav: { alignItems: 'center', flexDirection: 'row', gap: 27, marginLeft: 'auto', marginRight: 26 },
  navItem: { paddingVertical: 10 },
  navText: { color: brand.ink, fontSize: 12, fontWeight: '700' },
  loginButton: { alignItems: 'center', borderColor: brand.border, borderRadius: 24, borderWidth: 1, minHeight: 40, justifyContent: 'center', paddingHorizontal: 20 },
  loginText: { color: brand.ink, fontSize: 12, fontWeight: '800' },
  heroOuter: { backgroundColor: brand.navy, paddingHorizontal: 22, paddingVertical: 42, width: '100%' },
  hero: { alignSelf: 'center', maxWidth: 1132, width: '100%' },
  heroWide: { alignItems: 'center', flexDirection: 'row', gap: 45, minHeight: 440 },
  heroCopy: { paddingBottom: 16, paddingTop: 20 },
  heroCopyWide: { flex: 1.12, paddingVertical: 25 },
  eyebrowPill: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#FFFFFF12', borderColor: '#FFFFFF28', borderRadius: 25, borderWidth: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  liveDot: { backgroundColor: '#73D6A0', borderRadius: 4, height: 7, width: 7 },
  eyebrow: { color: '#D4E2DC', fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  heroTitle: { color: '#fff', fontSize: 51, fontWeight: '900', letterSpacing: -2.2, lineHeight: 57, marginTop: 21, maxWidth: 620 },
  heroTitleCompact: { fontSize: 39, letterSpacing: -1.5, lineHeight: 44 },
  heroText: { color: '#D8DFDC', fontSize: 15, lineHeight: 24, marginTop: 17, maxWidth: 545 },
  heroActions: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 11, marginTop: 26 },
  primaryButton: { alignItems: 'center', backgroundColor: brand.orange, borderRadius: 11, justifyContent: 'center', minHeight: 49, paddingHorizontal: 19 },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  buttonArrow: { fontSize: 16, fontWeight: '800' },
  secondaryButton: { alignItems: 'center', borderColor: '#FFFFFF66', borderRadius: 11, borderWidth: 1, justifyContent: 'center', minHeight: 49, paddingHorizontal: 19 },
  secondaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  heroNote: { color: '#B7C4BE', fontSize: 10, marginTop: 14 },
  illustration: { alignItems: 'center', justifyContent: 'center', minHeight: 280, marginTop: 14, position: 'relative' },
  illustrationCompact: { alignSelf: 'center', marginTop: 20, width: '100%' },
  orbGreen: { backgroundColor: brand.green, borderRadius: 130, height: 218, opacity: 0.72, position: 'absolute', right: 4, top: 5, width: 218 },
  orbOrange: { backgroundColor: brand.orange, borderRadius: 60, height: 92, left: 5, opacity: 0.93, position: 'absolute', top: 195, width: 92 },
  workCard: { backgroundColor: '#fff', borderColor: '#FFFFFFA0', borderRadius: 20, borderWidth: 1, maxWidth: 380, padding: 22, transform: [{ rotate: '-2deg' }], width: '90%' },
  workCardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  workCardLabel: { color: brand.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  workCardIcon: { alignItems: 'center', backgroundColor: brand.greenSoft, borderRadius: 18, color: brand.green, fontSize: 18, height: 34, overflow: 'hidden', paddingTop: 5, textAlign: 'center', width: 34 },
  workCardTitle: { color: brand.ink, fontSize: 19, fontWeight: '900', marginTop: 13 },
  workCardDescription: { color: brand.muted, fontSize: 11, marginTop: 4 },
  workDivider: { backgroundColor: brand.border, height: 1, marginVertical: 15 },
  proposalRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  avatar: { alignItems: 'center', backgroundColor: '#DAECE1', borderRadius: 20, height: 39, justifyContent: 'center', width: 39 },
  avatarText: { color: brand.green, fontSize: 13, fontWeight: '900' },
  proposalCopy: { flex: 1 },
  proposalName: { color: brand.ink, fontSize: 11, fontWeight: '800' },
  proposalMeta: { color: brand.muted, fontSize: 9, marginTop: 3 },
  checkMark: { alignItems: 'center', backgroundColor: brand.greenSoft, borderRadius: 14, color: brand.green, fontSize: 13, fontWeight: '900', height: 27, overflow: 'hidden', paddingTop: 4, textAlign: 'center', width: 27 },
  workCardFooter: { alignItems: 'center', backgroundColor: '#F5F7F5', borderRadius: 8, flexDirection: 'row', gap: 7, marginTop: 16, padding: 9 },
  footerDot: { backgroundColor: brand.orange, borderRadius: 4, height: 7, width: 7 },
  workCardFooterText: { color: brand.ink, fontSize: 9, fontWeight: '700' },
  floatingBadge: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, bottom: 7, elevation: 4, flexDirection: 'row', gap: 7, paddingHorizontal: 12, paddingVertical: 9, position: 'absolute', right: 0, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12 },
  badgeIcon: { color: brand.orangeDark, fontSize: 14 },
  badgeText: { color: brand.ink, fontSize: 9, fontWeight: '800' },
  quickFactsOuter: { backgroundColor: '#fff', borderBottomColor: brand.border, borderBottomWidth: 1, paddingHorizontal: 22, paddingVertical: 20 },
  quickFacts: { alignSelf: 'center', flexDirection: 'row', gap: 30, maxWidth: 1080, width: '100%' },
  quickFactsCompact: { flexDirection: 'column', gap: 17 },
  fact: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 12 },
  factNumber: { alignItems: 'center', backgroundColor: brand.orangeSoft, borderRadius: 20, height: 39, justifyContent: 'center', width: 39 },
  factNumberText: { color: brand.orangeDark, fontSize: 10, fontWeight: '900' },
  factTitle: { color: brand.ink, fontSize: 12, fontWeight: '900' },
  factText: { color: brand.muted, fontSize: 10, lineHeight: 15, marginTop: 2 },
  sectionOuter: { alignItems: 'center', paddingHorizontal: 22, paddingTop: 68, paddingBottom: 60 },
  sectionHeading: { alignItems: 'center', maxWidth: 700 },
  sectionEyebrow: { color: brand.green, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  sectionTitle: { color: brand.ink, fontSize: 30, fontWeight: '900', letterSpacing: -1, lineHeight: 36, marginTop: 9, textAlign: 'center' },
  sectionIntro: { color: brand.muted, fontSize: 13, lineHeight: 20, marginTop: 9, maxWidth: 610, textAlign: 'center' },
  audienceGrid: { flexDirection: 'row', gap: 16, marginTop: 30, maxWidth: 1060, width: '100%' },
  audienceGridCompact: { flexDirection: 'column' },
  audienceCard: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 18, borderWidth: 1, flex: 1, minHeight: 255, padding: 23 },
  workerCard: { backgroundColor: '#F0F5EF', borderColor: '#D6E4D8' },
  audienceIcon: { alignItems: 'center', borderRadius: 14, height: 44, justifyContent: 'center', width: 44 },
  customerIcon: { backgroundColor: brand.orangeSoft },
  workerIcon: { backgroundColor: '#DCEDE0' },
  audienceEmoji: { color: brand.orangeDark, fontSize: 21, fontWeight: '800' },
  audienceKicker: { color: brand.green, fontSize: 8, fontWeight: '900', letterSpacing: 1.1, marginTop: 19 },
  audienceTitle: { color: brand.ink, fontSize: 20, fontWeight: '900', letterSpacing: -0.5, marginTop: 7 },
  audienceText: { color: brand.muted, fontSize: 11, lineHeight: 18, marginTop: 8, maxWidth: 450 },
  textAction: { alignSelf: 'flex-start', marginTop: 16, paddingVertical: 5 },
  textActionText: { color: brand.orangeDark, fontSize: 11, fontWeight: '900' },
  howOuter: { backgroundColor: '#EEF2EB', paddingHorizontal: 22, paddingVertical: 60, width: '100%' },
  howSection: { alignSelf: 'center', alignItems: 'center', maxWidth: 1090, width: '100%' },
  stepsGrid: { flexDirection: 'row', gap: 14, marginTop: 28, width: '100%' },
  stepsGridCompact: { flexDirection: 'column' },
  stepCard: { backgroundColor: '#fff', borderColor: '#DEE7DF', borderRadius: 16, borderWidth: 1, flex: 1, minHeight: 150, padding: 19 },
  stepNumber: { color: brand.orange, fontSize: 25, fontWeight: '900' },
  stepTitle: { color: brand.ink, fontSize: 14, fontWeight: '900', marginTop: 10 },
  stepText: { color: brand.muted, fontSize: 10, lineHeight: 16, marginTop: 6 },
  howButton: { backgroundColor: brand.navy, borderRadius: 10, marginTop: 24, paddingHorizontal: 18, paddingVertical: 13 },
  howButtonText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  categoriesOuter: { paddingHorizontal: 22, paddingVertical: 64, width: '100%' },
  categoriesSection: { alignSelf: 'center', alignItems: 'center', maxWidth: 1080, width: '100%' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 25, maxWidth: 900 },
  categoryChip: { alignItems: 'center', backgroundColor: '#fff', borderColor: brand.border, borderRadius: 30, borderWidth: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 11 },
  categoryIcon: { fontSize: 14 },
  categoryName: { color: brand.ink, fontSize: 10, fontWeight: '800' },
  categoryArrow: { color: brand.green, fontSize: 11, fontWeight: '900' },
  trustOuter: { paddingHorizontal: 22, paddingBottom: 60, width: '100%' },
  trustCard: { alignSelf: 'center', backgroundColor: brand.navy, borderRadius: 18, maxWidth: 1080, padding: 25, width: '100%' },
  trustCardWide: { alignItems: 'flex-start', flexDirection: 'row', gap: 22, padding: 31 },
  trustMark: { alignItems: 'center', backgroundColor: brand.green, borderRadius: 15, height: 48, justifyContent: 'center', width: 48 },
  trustMarkText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  trustCopy: { flex: 1 },
  trustTitle: { color: '#fff', fontSize: 21, fontWeight: '900', letterSpacing: -0.5, marginTop: 8 },
  trustText: { color: '#D5DEDA', fontSize: 11, lineHeight: 18, marginTop: 8, maxWidth: 760 },
  finalOuter: { backgroundColor: '#fff', paddingHorizontal: 22, paddingVertical: 26, width: '100%' },
  finalCard: { alignSelf: 'center', backgroundColor: brand.green, borderRadius: 18, maxWidth: 1080, padding: 25, width: '100%' },
  finalCardWide: { alignItems: 'center', flexDirection: 'row', gap: 24, paddingHorizontal: 34, paddingVertical: 30 },
  finalEyebrow: { color: '#D9EFE1', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  finalTitle: { color: '#fff', fontSize: 25, fontWeight: '900', letterSpacing: -0.7, lineHeight: 31, marginTop: 8, maxWidth: 540 },
  finalActions: { alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 14 },
  finalPrimary: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  finalPrimaryText: { color: brand.green, fontSize: 10, fontWeight: '900' },
  finalSecondary: { borderColor: '#FFFFFF88', borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  finalSecondaryText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  footerOuter: { backgroundColor: '#fff', paddingHorizontal: 22, paddingTop: 35, paddingBottom: 24, width: '100%' },
  footer: { alignSelf: 'center', maxWidth: 1080, width: '100%' },
  footerBrand: { color: brand.navy, fontSize: 19, fontWeight: '900' },
  footerTagline: { color: brand.ink, fontSize: 11, fontWeight: '700', marginTop: 4 },
  footerNote: { color: brand.muted, fontSize: 9, lineHeight: 14, marginTop: 10, maxWidth: 680 },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 17 },
  footerLink: { color: brand.orangeDark, fontSize: 9, fontWeight: '800' },
  copyright: { borderTopColor: brand.border, borderTopWidth: 1, color: brand.muted, fontSize: 8, marginTop: 20, paddingTop: 12 },
});

