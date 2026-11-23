import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Image, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
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
      if (active) Animated.timing(entrance, { toValue: 1, duration: reduceMotion ? 0 : 320, useNativeDriver: Platform.OS !== 'web' }).start();
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
              {wide ? <Pressable onPress={() => router.push('/work')} style={styles.navItem}><Text style={styles.navText}>Para profissionais</Text></Pressable> : null}
              <Pressable accessibilityRole="button" onPress={() => setAuthOpen(true)} style={styles.loginButton}><Text style={styles.loginText}>Entrar</Text></Pressable>
            </View>
          </View>
        </View>

        <View style={styles.heroOuter}>
          <View style={[styles.hero, !wide && styles.heroCompact]}>
            <Animated.View style={[styles.heroCopy, entranceStyle]}>
              <Text style={styles.eyebrow}>SERVIÇOS LOCAIS NO RIO GRANDE DO SUL</Text>
              <Text style={[styles.heroTitle, !wide && styles.heroTitleCompact]}>Precisa de um serviço?</Text>
              <Text style={[styles.heroTitle, styles.heroTitleSecond, !wide && styles.heroTitleCompact]}>Encontre quem faz.</Text>
              <Text style={styles.heroText}>Descreva o que precisa, compare propostas e escolha um profissional da sua região.</Text>
              <Pressable accessibilityRole="button" onPress={() => router.push(exploreHref)} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Encontrar um profissional <Text style={styles.arrow}>→</Text></Text>
              </Pressable>
              <Pressable accessibilityRole="link" onPress={() => router.push('/work')} style={styles.workerLink}>
                <Text style={styles.workerLinkText}>Quero oferecer meus serviços <Text style={styles.arrow}>→</Text></Text>
              </Pressable>
            </Animated.View>
            <Animated.View style={[styles.photoColumn, entranceStyle]}>
              <Image source={require('../../assets/images/movas-hero-illustration.jpg')} style={[styles.heroImage, !wide && styles.heroImageCompact]} resizeMode="cover" accessibilityLabel="Ilustração de dois profissionais MOVA$ usando EPI durante um serviço residencial" />
            </Animated.View>
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
  header: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', maxWidth: 1320, minHeight: 72, paddingHorizontal: 42, width: '100%' },
  headerCompact: { minHeight: 62, paddingHorizontal: 20 },
  brand: { paddingVertical: 8 },
  brandName: { color: '#F8F8F4', fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
  brandMoney: { color: '#B6CE59' },
  nav: { alignItems: 'center', flexDirection: 'row', gap: 30 },
  navItem: { paddingVertical: 10 },
  navText: { color: '#F4F4F0', fontSize: 13, fontWeight: '600' },
  loginButton: { backgroundColor: '#F4F3ED', justifyContent: 'center', minHeight: 42, paddingHorizontal: 20 },
  loginText: { color: ink, fontSize: 13, fontWeight: '700' },
  heroOuter: { backgroundColor: ink, paddingHorizontal: 42, paddingTop: 20, paddingBottom: 50, width: '100%' },
  hero: { alignSelf: 'center', alignItems: 'center', flexDirection: 'row', gap: 48, maxWidth: 1236, minHeight: 475, width: '100%' },
  heroCompact: { alignItems: 'stretch', flexDirection: 'column', gap: 24, minHeight: 0 },
  heroCopy: { flex: 1, paddingVertical: 32 },
  eyebrow: { color: '#B6CE59', fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
  heroTitle: { color: '#F8F8F4', fontFamily: Platform.select({ web: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }), fontSize: 49, fontWeight: '700', letterSpacing: -1.7, lineHeight: 56, marginTop: 27, maxWidth: 570 },
  heroTitleSecond: { marginTop: 0 },
  heroTitleCompact: { fontSize: 37, letterSpacing: -1.1, lineHeight: 43, marginTop: 18 },
  heroText: { color: '#D2D4CF', fontSize: 16, lineHeight: 25, marginTop: 20, maxWidth: 460 },
  primaryButton: { alignSelf: 'flex-start', backgroundColor: '#F4F3ED', justifyContent: 'center', marginTop: 27, minHeight: 52, paddingHorizontal: 21 },
  primaryButtonText: { color: ink, fontSize: 14, fontWeight: '700' },
  workerLink: { alignSelf: 'flex-start', marginTop: 17, paddingVertical: 7 },
  workerLinkText: { color: '#F4F4F0', fontSize: 14, fontWeight: '600' },
  arrow: { fontSize: 16 },
  photoColumn: { flex: 1.1, maxWidth: 650, minWidth: 0, width: '100%' },
  heroImage: { backgroundColor: '#D9D5C9', height: 410, width: '100%' },
  heroImageCompact: { height: undefined, aspectRatio: 1.5 },
  footerOuter: { backgroundColor: paper, paddingHorizontal: 42, paddingTop: 22, paddingBottom: 22 },
  footer: { alignSelf: 'center', alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 24, maxWidth: 1236, width: '100%' },
  footerCompact: { alignItems: 'flex-start', flexDirection: 'column', gap: 13 },
  footerTagline: { color: ink, flex: 1, fontSize: 12, fontWeight: '600' },
  footerLinks: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  footerLink: { color: ink, fontSize: 12, fontWeight: '600' },
  copyright: { color: '#77786F', fontSize: 11 },
});

