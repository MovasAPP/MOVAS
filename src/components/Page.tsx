import type { PropsWithChildren } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { brand } from '@/constants/brand';

type Props = PropsWithChildren<{ scroll?: boolean }>;

export function Page({ children, scroll = true }: Props) {
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: brand.background, flex: 1 },
  scrollContent: { alignItems: 'center', paddingBottom: Platform.OS === 'web' ? 56 : 30 },
  content: { maxWidth: Platform.OS === 'web' ? 1260 : 1120, paddingHorizontal: Platform.OS === 'web' ? 42 : 22, width: '100%' },
  fill: { flex: 1 },
});

