import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';

import { brand } from '@/constants/brand';

type Props = { mode: 'hire' | 'work' };

export function BrandHeader({ mode }: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const nextMode = mode === 'hire' ? 'work' : 'hire';

  return (
    <View style={styles.bar}>
      <Pressable accessibilityRole="link" onPress={() => router.push('/')} style={styles.brand}>
        <Image source={require('../../assets/images/movas-icon-foreground.png')} style={styles.mark} resizeMode="contain" />
        <View>
          <Text style={styles.name}>M<Text style={styles.nameGreen}>O</Text><Text style={styles.nameOrange}>V</Text>A<Text style={styles.nameGreen}>$</Text></Text>
          {width >= 420 ? <Text style={styles.tagline}>Conectando quem precisa a quem faz</Text> : null}
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(nextMode === 'work' ? '/work' : '/')}
        style={styles.modeButton}>
        <Text style={styles.modeIcon}>{mode === 'hire' ? '↗' : '⌂'}</Text>
        <Text style={styles.modeText}>{mode === 'hire' ? 'Quero trabalhar' : 'Quero contratar'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: brand.surface,
    borderBottomColor: brand.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
  },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  mark: { height: 42, width: 42 },
  name: { color: brand.ink, fontSize: 18, fontWeight: '900', letterSpacing: 0.2 },
  nameGreen: { color: brand.green },
  nameOrange: { color: brand.orange },
  tagline: { color: brand.muted, fontSize: 8, fontWeight: '700', letterSpacing: 0.15 },
  modeButton: {
    alignItems: 'center',
    backgroundColor: brand.orangeSoft,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  modeIcon: { color: brand.orangeDark, fontSize: 15, fontWeight: '800' },
  modeText: { color: brand.orangeDark, fontSize: 12, fontWeight: '800' },
});
