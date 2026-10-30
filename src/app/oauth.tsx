import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { BrandHeader } from '@/components/BrandHeader';
import { Page } from '@/components/Page';
import { brand } from '@/constants/brand';

export default function OAuthReturnScreen() {
  const router = useRouter();
  const { mercado_pago: result } = useLocalSearchParams<{ mercado_pago?: string }>();
  const connected = result === 'connected';
  const cancelled = result === 'cancelled';

  return <View style={styles.screen}>
    <BrandHeader mode="hire" />
    <Page>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>MERCADO PAGO</Text>
        <Text style={styles.title}>{connected ? 'Conta conectada' : cancelled ? 'Conexão cancelada' : 'Não foi possível conectar'}</Text>
        <Text style={styles.copy}>{connected ? 'A conta foi autorizada com segurança. Os pagamentos pelo MOVA$ ainda estão em configuração.' : cancelled ? 'Você pode conectar sua conta depois, pelo perfil profissional.' : 'Volte ao perfil e tente novamente. Se o erro continuar, a integração ainda pode estar em configuração.'}</Text>
        <Pressable onPress={() => router.replace('/profile')} style={styles.button}><Text style={styles.buttonText}>Voltar ao perfil</Text></Pressable>
      </View>
    </Page>
  </View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: brand.background, flex: 1 },
  card: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 18, borderWidth: 1, marginTop: 32, maxWidth: 620, padding: 22 },
  eyebrow: { color: brand.orangeDark, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  title: { color: brand.ink, fontSize: 26, fontWeight: '900', marginTop: 9 },
  copy: { color: brand.muted, fontSize: 13, lineHeight: 20, marginTop: 8 },
  button: { alignSelf: 'flex-start', backgroundColor: brand.orangeDark, borderRadius: 10, marginTop: 17, paddingHorizontal: 14, paddingVertical: 11 },
  buttonText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
