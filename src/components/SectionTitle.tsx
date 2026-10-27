import { StyleSheet, Text, View } from 'react-native';

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
  wrap: { gap: 4, marginBottom: 15, marginTop: 29 },
  title: { color: brand.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { color: brand.muted, fontSize: 13, lineHeight: 19 },
});
