import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { AuthModal } from '@/components/AuthModal';

export function MarketingLanding() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [entrance] = useState(() => new Animated.Value(0));
  const [authOpen, setAuthOpen] = useState(false);
  const wide = width >= 860;
  const exploreHref = '/explore' as Href;

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (active) Animated.timing(entrance, { toValue: 1, duration: reduceMotion ? 0 : 380, useNativeDriver: true }).start();
    });
    return () => { active = false; };
  }, [entrance]);

  const entranceStyle = { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] };

  return (
    <View style={styles.screen}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerOuter}>
          <View style={[styles.header, !wide && styles.headerCompact]}>
            <Pressable accessibilityRole="link" accessibilityLabel="MOVA$ - página inicial" onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} style={styles.brand}>
              <Text style={styles.brandName}>MOVA<Text style={styles.brandMoney}>$</Text></Text>
            </Pressable>
            <View style={styles.nav}>
              {wide ? <Pressable onPress={() => router.push('/safety')} style={styles.navItem}><Text style={styles.navText}>Segurança</Text></Pressable> : null}
              <Pressable onPress={() => router.push('/work')} style={styles.navItem}><Text style={styles.navText}>Para profissionais</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => setAuthOpen(true)} style={styles.loginButton}><Text style={styles.loginText}>Entrar</Text></Pressable>
            </View>
          </View>
        </View>

        <View style={styles.heroOuter}>
          <View style={[styles.hero, !wide && styles.heroCompact]}>
            <Animated.View style={[styles.heroCopy, entranceStyle]}>
              <Text style={styles.eyebrow}>SERVIÇOS LOCAIS · RIO GRANDE DO SUL</Text>
              <Text style={[styles.heroTitle, !wide && styles.heroTitleCompact]}>PRECISA DE UM SERVIÇO?</Text>
              <Text style={[styles.heroTitle, styles.heroTitleSecond, !wide && styles.heroTitleCompact]}>ENCONTRE QUEM FAZ.</Text>
              <Text style={styles.heroText}>Descreva o que precisa. Receba propostas de profissionais da sua região.</Text>
              <Pressable accessibilityRole="button" onPress={() => router.push(exploreHref)} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Encontrar um profissional <Text style={styles.arrow}>→</Text></Text>
              </Pressable>
            </Animated.View>
            <Animated.View style={[styles.photoColumn, entranceStyle]}>
              <Image source={require('../../assets/images/movas-hero-illustration.jpg')} style={[styles.heroImage, !wide && styles.heroImageCompact]} resizeMode="cover" accessibilityLabel="Ilustração de dois profissionais MOVA$ usando EPI durante um serviço residencial" />
            </Animated.View>
          </View>
        </View>

        <View style={styles.startOuter}>
          <View style={styles.startInner}>
            <Text style={styles.startEyebrow}>ESCOLHA POR ONDE COMEÇAR</Text>
            <View style={[styles.startLinks, !wide && styles.startLinksCompact]}>
              <Pressable onPress={() => router.push(exploreHref)} style={styles.startLink}>
                <Text style={styles.startTitle}>Preciso contratar</Text><Text style={styles.startArrow}>→</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/work')} style={styles.startLink}>
                <Text style={styles.startTitle}>Quero trabalhar</Text><Text style={styles.startArrow}>→</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.footerOuter}>
          <View style={[styles.footer, !wide && styles.footerCompact]}>
            <Text style={styles.footerTagline}>MOVA$ · Conectando quem precisa a quem faz.</Text>
            <View style={styles.footerLinks}>
              <Pressable onPress={() => router.push('/safety')}><Text style={styles.footerLink}>Segurança</Text></Pressable>
              <Pressable onPress={() => setAuthOpen(true)}><Text style={styles.footerLink}>Entrar ou criar conta</Text></Pressable>
            </View>
            <Text style={styles.copyright}>© 2026 MOVA$</Text>
          </View>
        </View>
      </ScrollView>
      <AuthModal visible={authOpen} onClose={() => setAuthOpen(false)} />
    </View>
  );
}

const ink = '#191B19';
const paper = '#F4F3ED';
const styles = StyleSheet.create({
  screen: { backgroundColor: paper, flex: 1 },
  scrollContent: { paddingBottom: 0 },
  headerOuter: { backgroundColor: ink, width: '100%' },
  header: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', maxWidth: 1320, minHeight: 70, paddingHorizontal: 42, width: '100%' },
  headerCompact: { minHeight: 62, paddingHorizontal: 20 },
  brand: { paddingVertical: 8 },
  brandName: { color: '#F8F8F4', fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
  brandMoney: { color: '#B6CE59' },
  nav: { alignItems: 'center', flexDirection: 'row', gap: 30 },
  navItem: { paddingVertical: 10 },
  navText: { color: '#F4F4F0', fontSize: 11, fontWeight: '600' },
  loginButton: { backgroundColor: '#F4F3ED', justifyContent: 'center', minHeight: 36, paddingHorizontal: 18 },
  loginText: { color: ink, fontSize: 11, fontWeight: '700' },
  heroOuter: { backgroundColor: ink, paddingHorizontal: 42, paddingTop: 18, paddingBottom: 58, width: '100%' },
  hero: { alignSelf: 'center', alignItems: 'center', flexDirection: 'row', gap: 46, maxWidth: 1236, minHeight: 490, width: '100%' },
  heroCompact: { alignItems: 'stretch', flexDirection: 'column', gap: 25, minHeight: 0 },
  heroCopy: { flex: 1, paddingVertical: 34 },
  eyebrow: { color: '#B6CE59', fontSize: 9, fontWeight: '800', letterSpacing: 1.6 },
  heroTitle: { color: '#F8F8F4', fontFamily: 'Arial', fontSize: 54, fontWeight: '900', letterSpacing: -2.7, lineHeight: 59, marginTop: 26, maxWidth: 610 },
  heroTitleSecond: { marginTop: 0 },
  heroTitleCompact: { fontSize: 40, letterSpacing: -1.8, lineHeight: 44, marginTop: 19 },
  heroText: { color: '#D2D4CF', fontSize: 14, lineHeight: 22, marginTop: 18, maxWidth: 440 },
  primaryButton: { alignSelf: 'flex-start', backgroundColor: '#F4F3ED', justifyContent: 'center', marginTop: 25, minHeight: 49, paddingHorizontal: 19 },
  primaryButtonText: { color: ink, fontSize: 12, fontWeight: '700' },
  arrow: { fontSize: 15 },
  photoColumn: { flex: 1.1, maxWidth: 650, minWidth: 0, width: '100%' },
  heroImage: { backgroundColor: '#D9D5C9', height: 410, width: '100%' },
  heroImageCompact: { height: undefined, aspectRatio: 1.5 },
  startOuter: { backgroundColor: '#E8EBE0', paddingHorizontal: 42, paddingVertical: 32, width: '100%' },
  startInner: { alignSelf: 'center', maxWidth: 1236, width: '100%' },
  startEyebrow: { color: '#656B5A', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 11 },
  startLinks: { flexDirection: 'row', gap: 32 },
  startLinksCompact: { flexDirection: 'column', gap: 0 },
  startLink: { alignItems: 'center', borderBottomColor: '#9B9E92', borderBottomWidth: 1, flex: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 76, paddingVertical: 12 },
  startTitle: { color: ink, fontFamily: 'Arial', fontSize: 27, fontWeight: '700', letterSpacing: -0.8 },
  startArrow: { color: ink, fontSize: 30, fontWeight: '400' },
  footerOuter: { backgroundColor: paper, paddingHorizontal: 42, paddingTop: 22, paddingBottom: 22 },
  footer: { alignSelf: 'center', alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 24, maxWidth: 1236, width: '100%' },
  footerCompact: { alignItems: 'flex-start', flexDirection: 'column', gap: 13 },
  footerTagline: { color: ink, flex: 1, fontSize: 10, fontWeight: '600' },
  footerLinks: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  footerLink: { color: ink, fontSize: 10, fontWeight: '600' },
  copyright: { color: '#77786F', fontSize: 9 },
});

