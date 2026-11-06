import { Platform, StyleSheet, Text, View } from 'react-native';

import { brand } from '@/constants/brand';

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginBottom: Platform.OS === 'web' ? 20 : 15, marginTop: Platform.OS === 'web' ? 38 : 29 },
  title: { color: brand.ink, fontFamily: Platform.OS === 'web' ? 'Georgia' : undefined, fontSize: Platform.OS === 'web' ? 28 : 22, fontWeight: Platform.OS === 'web' ? '400' : '800', letterSpacing: Platform.OS === 'web' ? -0.4 : -0.6 },
  subtitle: { color: brand.muted, fontSize: 13, lineHeight: 19 },
});

