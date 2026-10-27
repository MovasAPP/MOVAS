import { useState } from 'react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { brand, categories } from '@/constants/brand';

export type QuoteRequest = {
  category: string;
  description: string;
  city: string;
  date: string;
  budget: string;
  photos: string[];
  requiresEpi: boolean;
  epiDetails: string;
  requiresMei: boolean;
  requiresInvoice: boolean;
};

type Props = {
  initialCategory?: string;
  visible: boolean;
  onClose: () => void;
  onSubmit: (request: QuoteRequest) => Promise<void>;
};

export function QuoteRequestModal({ initialCategory = '', visible, onClose, onSubmit }: Props) {
  const [category, setCategory] = useState(initialCategory);
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [budget, setBudget] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [requiresEpi, setRequiresEpi] = useState(false);
  const [epiDetails, setEpiDetails] = useState('');
  const [requiresMei, setRequiresMei] = useState(false);
  const [requiresInvoice, setRequiresInvoice] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function addPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Permita o acesso às fotos para anexar imagens do trabalho.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
    });
    if (!result.canceled) setPhotos(result.assets.map((asset) => asset.uri));
  }

  async function submit() {
    if (busy) return;
    if (!category) return setError('Escolha a categoria do serviço.');
    if (!description.trim()) return setError('Descreva o trabalho. As fotos são opcionais.');
    if (!city.trim()) return setError('Informe a cidade do serviço.');
    setError('');
    setBusy(true);
    try {
      await onSubmit({ category, description: description.trim(), city: city.trim(), date, budget, photos, requiresEpi, epiDetails, requiresMei, requiresInvoice });
      setCategory(initialCategory);
      setDescription('');
      setCity('');
      setDate('');
      setBudget('');
      setPhotos([]);
      setRequiresEpi(false);
      setEpiDetails('');
      setRequiresMei(false);
      setRequiresInvoice(false);
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível publicar o pedido. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.dialogWrap}>
          <View style={styles.dialog}>
            <View style={styles.headingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Solicite um orçamento</Text>
                <Text style={styles.subtitle}>Descreva o trabalho. As fotos ajudam, mas são opcionais.</Text>
              </View>
              <Pressable accessibilityLabel="Fechar" onPress={onClose} style={styles.close}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Categoria</Text>
              <View style={styles.categoryGrid}>
                {categories.map((item) => (
                  <Pressable
                    key={item.name}
                    onPress={() => setCategory(item.name)}
                    style={[styles.categoryChip, category === item.name && styles.categoryChipActive]}>
                    <Text style={styles.categoryIcon}>{item.icon}</Text>
                    <Text style={[styles.categoryName, category === item.name && styles.categoryNameActive]}>{item.name}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Descreva o trabalho</Text>
              <TextInput
                multiline
                numberOfLines={4}
                onChangeText={setDescription}
                placeholder="O que precisa ser feito? Inclua medidas ou detalhes importantes."
                placeholderTextColor="#87938E"
                style={[styles.input, styles.textArea]}
                value={description}
              />
              <Text style={styles.helper}>Você pode solicitar orçamento usando só a descrição.</Text>
              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={styles.label}>Cidade no RS</Text>
                  <TextInput onChangeText={setCity} placeholder="Ex.: Tramandaí" placeholderTextColor="#87938E" style={styles.input} value={city} />
                </View>
                <View style={styles.half}>
                  <Text style={styles.label}>Quando precisa?</Text>
                  <TextInput onChangeText={setDate} placeholder="Ex.: Sábado" placeholderTextColor="#87938E" style={styles.input} value={date} />
                </View>
              </View>
              <Text style={styles.label}>Fotos do trabalho (opcional)</Text>
              <Pressable onPress={addPhotos} style={styles.photoButton}>
                <Text style={styles.photoIcon}>＋</Text>
                <Text style={styles.photoText}>{photos.length ? `${photos.length} foto(s) selecionada(s)` : 'Adicionar fotos do serviço'}</Text>
              </Pressable>
              {photos.length ? (
                <ScrollView horizontal contentContainerStyle={styles.photoList}>
                  {photos.map((uri) => <Image key={uri} source={{ uri }} style={styles.photoThumb} />)}
                </ScrollView>
              ) : null}
              <Text style={styles.helper}>Não inclua CNH, documentos pessoais ou dados sensíveis nas fotos do serviço.</Text>
              <Text style={styles.label}>Faixa de preço (opcional)</Text>
              <TextInput keyboardType="decimal-pad" onChangeText={setBudget} placeholder="R$" placeholderTextColor="#87938E" style={styles.input} value={budget} />
              <View style={styles.requirementBox}>
                <Text style={styles.requirementTitle}>Exigências do serviço (opcional)</Text>
                <Text style={styles.helper}>Marque apenas os requisitos obrigatórios para este trabalho.</Text>
                <CheckRow label="Uso de EPI obrigatório" value={requiresEpi} onPress={() => setRequiresEpi(!requiresEpi)} />
                {requiresEpi ? <TextInput onChangeText={setEpiDetails} placeholder="Quais EPIs? Ex.: luvas, óculos, capacete" placeholderTextColor="#87938E" style={styles.input} value={epiDetails} /> : null}
                <CheckRow label="Profissional precisa ter MEI ativo" value={requiresMei} onPress={() => setRequiresMei(!requiresMei)} />
                <CheckRow label="Profissional precisa emitir nota fiscal" value={requiresInvoice} onPress={() => setRequiresInvoice(!requiresInvoice)} />
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable disabled={busy} onPress={() => void submit()} style={[styles.submit, busy && { opacity: 0.65 }]}>
                <Text style={styles.submitText}>{busy ? 'Publicando pedido…' : 'Enviar pedido de orçamento'}</Text>
              </Pressable>
              <Text style={styles.footerNote}>Seu pedido será publicado para profissionais da região.</Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function CheckRow({ label, value, onPress }: { label: string; value: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: value }} onPress={onPress} style={styles.checkRow}>
      <View style={[styles.checkbox, value && styles.checkboxActive]}>{value ? <Text style={styles.tick}>✓</Text> : null}</View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { alignItems: 'center', backgroundColor: '#10221FD8', flex: 1, justifyContent: 'center', padding: 12 },
  dialogWrap: { maxHeight: '94%', width: '100%', maxWidth: 590 },
  dialog: { backgroundColor: brand.surface, borderRadius: 22, maxHeight: '100%', padding: 20 },
  headingRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 14, marginBottom: 15 },
  title: { color: brand.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: brand.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  close: { alignItems: 'center', backgroundColor: '#F2F4F2', borderRadius: 18, height: 35, justifyContent: 'center', width: 35 },
  closeText: { color: brand.ink, fontSize: 23, lineHeight: 27 },
  label: { color: brand.ink, fontSize: 12, fontWeight: '800', marginBottom: 7, marginTop: 13 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  categoryChip: { alignItems: 'center', backgroundColor: '#F5F7F5', borderColor: brand.border, borderRadius: 11, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 9, paddingVertical: 8 },
  categoryChipActive: { backgroundColor: brand.orangeSoft, borderColor: brand.orange },
  categoryIcon: { fontSize: 14 },
  categoryName: { color: '#52625D', fontSize: 11, fontWeight: '700' },
  categoryNameActive: { color: brand.orangeDark },
  input: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 11, borderWidth: 1, color: brand.ink, fontSize: 14, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 },
  textArea: { minHeight: 94, textAlignVertical: 'top' },
  helper: { color: brand.muted, fontSize: 10, lineHeight: 15, marginTop: 5 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  photoButton: { alignItems: 'center', backgroundColor: brand.orangeSoft, borderColor: '#F3D3C5', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, flexDirection: 'row', gap: 8, minHeight: 46, paddingHorizontal: 13 },
  photoIcon: { color: brand.orangeDark, fontSize: 20, fontWeight: '700' },
  photoText: { color: brand.orangeDark, fontSize: 12, fontWeight: '800' },
  photoList: { gap: 8, paddingTop: 9 },
  photoThumb: { borderRadius: 9, height: 68, width: 68 },
  requirementBox: { backgroundColor: '#FFF7F1', borderColor: '#F4E0D5', borderRadius: 13, borderWidth: 1, marginTop: 16, padding: 12 },
  requirementTitle: { color: brand.ink, fontSize: 13, fontWeight: '800' },
  checkRow: { alignItems: 'center', flexDirection: 'row', gap: 9, paddingVertical: 8 },
  checkbox: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#BAC5BF', borderRadius: 5, borderWidth: 1, height: 18, justifyContent: 'center', width: 18 },
  checkboxActive: { backgroundColor: brand.orange, borderColor: brand.orange },
  tick: { color: '#fff', fontSize: 12, fontWeight: '900' },
  checkLabel: { color: brand.ink, flex: 1, fontSize: 11, fontWeight: '600' },
  error: { color: '#B42318', fontSize: 12, fontWeight: '700', marginVertical: 8 },
  submit: { alignItems: 'center', backgroundColor: brand.orange, borderRadius: 12, marginTop: 16, padding: 14 },
  submitText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  footerNote: { color: brand.muted, fontSize: 10, lineHeight: 15, marginBottom: 6, marginTop: 10, textAlign: 'center' },
});
