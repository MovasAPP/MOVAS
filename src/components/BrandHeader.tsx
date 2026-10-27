import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { brand } from '@/constants/brand';

type Props = { mode: 'hire' | 'work' };

export function BrandHeader({ mode }: Props) {
  const router = useRouter();
  const nextMode = mode === 'hire' ? 'work' : 'hire';

  return (
    <View style={styles.bar}>
      <Pressable accessibilityRole="link" onPress={() => router.push('/')} style={styles.brand}>
        <View style={styles.mark}>
          <Text style={styles.markLetter}>C</Text>
          <View style={styles.check}><Text style={styles.checkText}>✓</Text></View>
        </View>
        <View>
          <Text style={styles.name}>{brand.name}</Text>
          <Text style={styles.tagline}>serviços perto de você</Text>
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
    paddingHorizontal: 22,
    paddingVertical: 13,
    width: '100%',
  },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  mark: {
    alignItems: 'center',
    backgroundColor: brand.orange,
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
    position: 'relative',
  },
  markLetter: { color: '#fff', fontSize: 21, fontWeight: '900' },
  check: {
    alignItems: 'center',
    backgroundColor: brand.yellow,
    borderColor: '#fff',
    borderRadius: 9,
    borderWidth: 2,
    bottom: -4,
    height: 17,
    justifyContent: 'center',
    position: 'absolute',
    right: -4,
    width: 17,
  },
  checkText: { color: brand.ink, fontSize: 9, fontWeight: '900', lineHeight: 11 },
  name: { color: brand.ink, fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  tagline: { color: brand.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
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
