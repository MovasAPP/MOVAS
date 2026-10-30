import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';

import { BrandHeader } from '@/components/BrandHeader';
import { Page } from '@/components/Page';
import { brand } from '@/constants/brand';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const linkingUrl = Linking.useLinkingURL();
  const [message, setMessage] = useState('Confirmando seu endereço de e-mail…');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let active = true;
    async function confirmEmail() {
      try {
        if (Platform.OS !== 'web' && linkingUrl?.startsWith('contratei://')) {
          const code = new URL(linkingUrl).searchParams.get('code');
          if (code) {
            const { data: current } = await supabase.auth.getSession();
            if (!current.session) {
              const { error } = await supabase.auth.exchangeCodeForSession(code);
              if (error) throw error;
            }
          }
        }
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) throw new Error('Não foi possível confirmar este link. Confira se ele expirou ou já foi usado.');
        if (active) {
          setConfirmed(true);
          setMessage('E-mail confirmado. Sua conta MOVA$ está pronta para usar.');
        }
      } catch (caught) {
        if (active) setMessage(caught instanceof Error ? caught.message : 'Não foi possível confirmar seu e-mail. Solicite um novo link.');
      }
    }
    void confirmEmail();
    return () => { active = false; };
  }, [linkingUrl]);

  return (
    <View style={styles.screen}>
      <BrandHeader mode="hire" />
      <Page>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>CONTA MOVA$</Text>
          <Text style={styles.title}>{confirmed ? 'Tudo certo!' : 'Confirmação de e-mail'}</Text>
          <Text accessibilityRole={confirmed ? 'status' : 'alert'} style={[styles.body, !confirmed && styles.pending]}>{message}</Text>
          <Pressable onPress={() => router.replace(confirmed ? '/profile' : '/')} style={styles.button}><Text style={styles.buttonText}>{confirmed ? 'Continuar' : 'Voltar ao início'}</Text></Pressable>
        </View>
      </Page>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: brand.background, flex: 1 },
  card: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 18, borderWidth: 1, marginTop: 40, maxWidth: 520, padding: 22, width: '100%' },
  eyebrow: { color: brand.orangeDark, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: brand.ink, fontSize: 28, fontWeight: '900', letterSpacing: -0.8, marginTop: 8 },
  body: { color: brand.success, fontSize: 12, lineHeight: 18, marginTop: 9 },
  pending: { color: brand.muted },
  button: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: brand.orangeDark, borderRadius: 11, marginTop: 18, paddingHorizontal: 16, paddingVertical: 12 },
  buttonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
});
