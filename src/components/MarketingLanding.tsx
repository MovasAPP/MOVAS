import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { AuthModal } from '@/components/AuthModal';
import { brand } from '@/constants/brand';

export function MarketingLanding() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [entrance] = useState(() => new Animated.Value(0));
  const [authOpen, setAuthOpen] = useState(false);
  const wide = width >= 820;
  const exploreHref = '/explore' as Href;

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (active) Animated.timing(entrance, { toValue: 1, duration: reduceMotion ? 0 : 420, useNativeDriver: true }).start();
    });
    return () => { active = false; };
  }, [entrance]);

  const entranceStyle = { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] };

  return (
    <View style={styles.screen}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerOuter}>
          <View style={[styles.header, !wide && styles.headerCompact]}>
            <Pressable accessibilityRole="link" accessibilityLabel="MOVA$ - página inicial" onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} style={styles.brand}>
              <Image source={require('../../assets/images/movas-icon-foreground.png')} style={styles.logo} resizeMode="contain" />
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
              <Text style={[styles.heroTitle, !wide && styles.heroTitleCompact]}>PRECISA DE UMA MÃO?</Text>
              <Text style={[styles.heroTitle, styles.heroTitleSecond, !wide && styles.heroTitleCompact]}>ENCONTRE QUEM FAZ.</Text>
              <Text style={styles.heroText}>Descreva o serviço. Receba propostas de profissionais da sua região.</Text>
              <View style={styles.heroActions}>
                <Pressable accessibilityRole="button" onPress={() => router.push(exploreHref)} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Encontrar um profissional <Text style={styles.arrow}>→</Text></Text></Pressable>
                <Pressable accessibilityRole="button" onPress={() => router.push('/work')} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Quero trabalhar</Text></Pressable>
              </View>
            </Animated.View>
            <Animated.View style={[styles.photoColumn, entranceStyle]}>
              <Image source={require('../../assets/images/movas-worker-happy.jpg')} style={styles.workerImage} resizeMode="cover" accessibilityLabel="Profissional sorrindo enquanto pinta uma parede" />
              <View style={styles.photoCaption}><Text style={styles.photoCaptionText}>QUEM FAZ ACONTECER</Text><Text style={styles.photoLocation}>Rio Grande do Sul · MOVA$</Text></View>
            </Animated.View>
          </View>
        </View>

        <View style={styles.stepsOuter}>
          <View style={[styles.steps, !wide && styles.stepsCompact]}>
            <Text style={styles.stepsLead}>Do pedido ao serviço:</Text>
            <Text style={styles.stepText}>Descreva <Text style={styles.stepDot}>·</Text> Receba propostas <Text style={styles.stepDot}>·</Text> Combine</Text>
          </View>
        </View>

        <View style={styles.footerOuter}>
          <View style={[styles.footer, !wide && styles.footerCompact]}>
            <Text style={styles.footerTagline}>Conectando quem precisa a quem faz.</Text>
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

const ink = '#292B28';
const paper = '#F4F1E9';
const line = '#C9C5BA';

const styles = StyleSheet.create({
  screen: { backgroundColor: paper, flex: 1 }, scrollContent: { paddingBottom: 0 },
  headerOuter: { backgroundColor: paper, borderBottomColor: line, borderBottomWidth: 1, width: '100%' },
  header: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', maxWidth: 1260, minHeight: 72, paddingHorizontal: 42, width: '100%' },
  headerCompact: { minHeight: 64, paddingHorizontal: 20 },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 9 }, logo: { height: 32, width: 32 }, brandName: { color: ink, fontSize: 18, fontWeight: '800', letterSpacing: 0.4 }, brandMoney: { color: brand.orange },
  nav: { alignItems: 'center', flexDirection: 'row', gap: 28 }, navItem: { paddingVertical: 10 }, navText: { color: ink, fontSize: 11, fontWeight: '600' }, loginButton: { borderColor: ink, borderWidth: 1, justifyContent: 'center', minHeight: 36, paddingHorizontal: 17 }, loginText: { color: ink, fontSize: 11, fontWeight: '700' },
  heroOuter: { paddingHorizontal: 42, paddingTop: 32, paddingBottom: 45, width: '100%' }, hero: { alignSelf: 'center', alignItems: 'center', flexDirection: 'row', gap: 38, maxWidth: 1176, minHeight: 500, width: '100%' }, heroCompact: { alignItems: 'stretch', flexDirection: 'column', gap: 28, minHeight: 0 }, heroCopy: { flex: 1, paddingVertical: 28 }, eyebrow: { color: '#68705D', fontSize: 9, fontWeight: '800', letterSpacing: 1.5 }, heroTitle: { color: ink, fontFamily: 'Arial', fontSize: 56, fontWeight: '900', letterSpacing: -2.8, lineHeight: 58, marginTop: 28 }, heroTitleSecond: { marginTop: 0 }, heroTitleCompact: { fontSize: 38, letterSpacing: -1.7, lineHeight: 41, marginTop: 20 }, heroText: { color: '#555750', fontSize: 14, lineHeight: 22, marginTop: 19, maxWidth: 430 }, heroActions: { alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 26 }, primaryButton: { backgroundColor: '#C75B35', justifyContent: 'center', minHeight: 47, paddingHorizontal: 17 }, primaryButtonText: { color: '#fff', fontSize: 11, fontWeight: '700' }, arrow: { fontSize: 14 }, secondaryButton: { borderColor: '#96958B', borderWidth: 1, justifyContent: 'center', minHeight: 47, paddingHorizontal: 15 }, secondaryButtonText: { color: ink, fontSize: 11, fontWeight: '700' },
  photoColumn: { flex: 1.06, maxWidth: 590, minWidth: 0, width: '100%' }, workerImage: { backgroundColor: '#D6D1C5', height: 400, width: '100%' }, photoCaption: { alignItems: 'center', borderBottomColor: ink, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 9, paddingTop: 10 }, photoCaptionText: { color: ink, fontSize: 8, fontWeight: '800', letterSpacing: 1.2 }, photoLocation: { color: '#696A62', fontSize: 9 },
  stepsOuter: { backgroundColor: '#E9E5DA', paddingHorizontal: 42, paddingVertical: 20 }, steps: { alignSelf: 'center', alignItems: 'center', flexDirection: 'row', gap: 30, justifyContent: 'space-between', maxWidth: 1176, width: '100%' }, stepsCompact: { alignItems: 'flex-start', flexDirection: 'column', gap: 6 }, stepsLead: { color: ink, fontFamily: 'Georgia', fontSize: 17 }, stepText: { color: '#5B5C54', fontSize: 11 }, stepDot: { color: '#A8492B', fontWeight: '900' },
  footerOuter: { paddingHorizontal: 42, paddingTop: 22, paddingBottom: 22 }, footer: { alignSelf: 'center', alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 24, maxWidth: 1176, width: '100%' }, footerCompact: { alignItems: 'flex-start', flexDirection: 'column', gap: 14 }, footerTagline: { color: ink, flex: 1, fontFamily: 'Georgia', fontSize: 13 }, footerLinks: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 20 }, footerLink: { color: ink, fontSize: 10, fontWeight: '600' }, copyright: { color: '#77786F', fontSize: 9 },
});

