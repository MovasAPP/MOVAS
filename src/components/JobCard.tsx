import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { brand } from '@/constants/brand';

export type Job = {
  id: string;
  title: string;
  category: string;
  icon: string;
  city: string;
  when: string;
  price: number;
  verified: boolean;
  requirements: string[];
  description: string;
  photoUrls?: string[];
};

type Props = {
  job: Job;
  actionLabel?: string;
  onAction: (job: Job) => void;
};

export function JobCard({ job, actionLabel = 'Ver serviço', onAction }: Props) {
  return (
    <View style={styles.card}>
      {job.photoUrls?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
          {job.photoUrls.map((url, index) => <Image key={url} source={{ uri: url }} contentFit="cover" style={styles.photo} accessibilityLabel={`Foto ${index + 1} do pedido`} />)}
        </ScrollView>
      ) : (
        <View style={[styles.art, { backgroundColor: colorFor(job.category) }]}>
          {Platform.OS === 'web' ? null : <Text style={styles.artIcon}>{job.icon}</Text>}
          <Text style={styles.category}>{job.category}</Text>
        </View>
      )}
      <Text style={styles.title}>{job.title}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>⌖ {job.city}, RS</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.meta}>{job.when}</Text>
      </View>
      {job.verified ? <Text style={styles.verified}>✓ Contratante verificado</Text> : null}
      {job.requirements.length > 0 ? (
        <View style={styles.requirements}>
          <Text style={styles.requirementTitle}>Exigências do contratante</Text>
          <Text style={styles.requirementList}>{job.requirements.join('  ·  ')}</Text>
        </View>
      ) : null}
      <View style={styles.footer}>
        <View>
          <Text style={styles.price}>{job.price > 0 ? money(job.price) : 'A combinar'}</Text>
          {job.price > 0 ? <Text style={styles.priceCaption}>valor do serviço</Text> : null}
        </View>
        <Pressable accessibilityRole="button" onPress={() => onAction(job)} style={styles.button}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function money(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function colorFor(category: string) {
  const colors: Record<string, string> = {
    Instalação: '#DCEED8',
    Limpeza: '#F7E8C5',
    Pintura: '#F4DDD5',
    Elétrica: '#F7E4AC',
    Reparos: '#D9ECEA',
    Babá: '#E7DEF1',
    Automação: '#DDEAF2',
  };
  return colors[category] ?? brand.orangeSoft;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: brand.surface,
    borderColor: brand.border,
    borderRadius: Platform.OS === 'web' ? 2 : 18,
    borderWidth: 1,
    flex: 1,
    minWidth: 255,
    maxWidth: 360,
    padding: 15,
  },
  art: {
    alignItems: 'flex-end',
    borderRadius: Platform.OS === 'web' ? 2 : 13,
    flexDirection: 'row',
    height: 106,
    justifyContent: 'space-between',
    marginBottom: 13,
    padding: 12,
  },
  photos: { gap: 8, marginBottom: 13 },
  photo: { borderRadius: Platform.OS === 'web' ? 2 : 13, height: 106, width: 190 },
  artIcon: {
    alignItems: 'center',
    backgroundColor: '#FFFFFFB8',
    borderRadius: 13,
    fontSize: 25,
    height: 46,
    overflow: 'hidden',
    paddingTop: 7,
    textAlign: 'center',
    width: 46,
  },
  category: {
    backgroundColor: '#FFFFFFC9',
    borderRadius: 30,
    color: brand.orangeDark,
    fontSize: 10,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  title: { color: brand.ink, fontFamily: Platform.OS === 'web' ? 'Georgia' : undefined, fontSize: 16, fontWeight: Platform.OS === 'web' ? '400' : '800', letterSpacing: -0.3, marginBottom: 7 },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  meta: { color: brand.muted, fontSize: 11 },
  dot: { color: '#AEB7B2' },
  verified: { color: brand.success, fontSize: 10, fontWeight: '800', marginTop: 8 },
  requirements: { backgroundColor: '#FFF4EA', borderRadius: 10, marginTop: 10, padding: 10 },
  requirementTitle: { color: brand.orangeDark, fontSize: 10, fontWeight: '800', marginBottom: 3 },
  requirementList: { color: '#77513F', fontSize: 10, lineHeight: 15 },
  footer: {
    alignItems: 'center',
    borderTopColor: brand.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
  },
  price: { color: brand.ink, fontSize: 16, fontWeight: '900' },
  priceCaption: { color: brand.muted, fontSize: 9, marginTop: 1 },
  button: { backgroundColor: brand.orangeSoft, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9 },
  buttonText: { color: brand.orangeDark, fontSize: 11, fontWeight: '800' },
});

