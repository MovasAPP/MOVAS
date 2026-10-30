import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Job } from '@/components/JobCard';
import { money } from '@/components/JobCard';
import { brand } from '@/constants/brand';
import { parseBrazilianAmount } from '@/lib/format';

type Props = { job: Job | null; onClose: () => void; onSubmit: (job: Job, amount: number, message: string) => Promise<void> };

export function ProposalModal({ job, onClose, onSubmit }: Props) {
  const [amount, setAmount] = useState(job?.price ? String(job.price) : '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const parsedAmount = parseBrazilianAmount(amount);
  const numericAmount = parsedAmount !== null && Number.isFinite(parsedAmount) ? parsedAmount : 0;
  const appFee = numericAmount * 0.1;

  async function send() {
    if (busy) return;
    if (!job) return;
    if (parsedAmount === null || !Number.isFinite(parsedAmount) || numericAmount <= 0) return setError('Informe um valor válido maior que zero.');
    if (!message.trim()) return setError('Escreva uma mensagem curta para o contratante.');
    setBusy(true);
    setError('');
    try {
      await onSubmit(job, numericAmount, message.trim());
      setAmount('');
      setMessage('');
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível enviar a proposta. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal animationType="slide" transparent visible={Boolean(job)} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.heading}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Enviar proposta</Text>
              <Text style={styles.subtitle}>{job?.title}</Text>
            </View>
            <Pressable accessibilityLabel="Fechar" onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
          </View>
          {job?.requirements.length ? (
            <View style={styles.requirementNote}>
              <Text style={styles.requirementLabel}>Confira as exigências</Text>
              <Text style={styles.requirementText}>{job.requirements.join('  ·  ')}</Text>
            </View>
          ) : null}
          <Text style={styles.label}>Seu preço pelo serviço (R$)</Text>
          <TextInput keyboardType="decimal-pad" onChangeText={setAmount} style={styles.input} value={amount} />
          <View style={styles.priceBox}>
            <PriceLine label="Seu valor pelo serviço" value={money(numericAmount)} />
            <PriceLine label="Taxa MOVA$ paga pelo cliente (10%)" value={money(appFee)} />
            <View style={styles.totalLine}><Text style={styles.totalLabel}>Total para o cliente</Text><Text style={styles.totalValue}>{money(numericAmount + appFee)}</Text></View>
          </View>
          <View style={styles.feeNote}>
            <Text style={styles.feeNoteText}>O cliente paga mais 10% de taxa MOVA$. A tarifa do Mercado Pago será descontada do que você recebe e varia conforme o meio de pagamento. O valor exato será informado no detalhamento da venda pelo Mercado Pago; o MOVA$ não consegue calculá-lo antes do pagamento. Pagamentos ainda não estão ativos.</Text>
          </View>
          <Text style={styles.label}>Mensagem ao contratante</Text>
          <TextInput
            multiline
            onChangeText={setMessage}
            placeholder="Fale sobre sua experiência, disponibilidade e o que está incluído."
            placeholderTextColor="#87938E"
            style={[styles.input, styles.textArea]}
            value={message}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable disabled={busy} onPress={() => void send()} style={[styles.submit, busy && { opacity: 0.65 }]}><Text style={styles.submitText}>{busy ? 'Enviando…' : 'Enviar proposta'}</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

function PriceLine({ label, value }: { label: string; value: string }) {
  return <View style={styles.priceLine}><Text style={styles.priceLabel}>{label}</Text><Text style={styles.priceValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  backdrop: { alignItems: 'center', backgroundColor: '#10221FD8', flex: 1, justifyContent: 'center', padding: 14 },
  dialog: { backgroundColor: brand.surface, borderRadius: 22, maxWidth: 520, padding: 22, width: '100%' },
  heading: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, marginBottom: 16 },
  title: { color: brand.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: brand.muted, fontSize: 12, marginTop: 4 },
  close: { alignItems: 'center', backgroundColor: '#F2F4F2', borderRadius: 18, height: 35, justifyContent: 'center', width: 35 },
  closeText: { color: brand.ink, fontSize: 23, lineHeight: 27 },
  requirementNote: { backgroundColor: '#FFF4EA', borderRadius: 11, marginBottom: 11, padding: 11 },
  requirementLabel: { color: brand.orangeDark, fontSize: 11, fontWeight: '800' },
  requirementText: { color: '#77513F', fontSize: 10, lineHeight: 15, marginTop: 4 },
  label: { color: brand.ink, fontSize: 12, fontWeight: '800', marginBottom: 7, marginTop: 12 },
  input: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 11, borderWidth: 1, color: brand.ink, fontSize: 14, minHeight: 45, paddingHorizontal: 12, paddingVertical: 10 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  priceBox: { backgroundColor: '#F7F8F6', borderRadius: 13, marginTop: 14, padding: 12 },
  priceLine: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  priceLabel: { color: '#52625D', flex: 1, fontSize: 11, paddingRight: 8 },
  priceValue: { color: brand.ink, fontSize: 11, fontWeight: '700' },
  totalLine: { borderTopColor: brand.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, paddingTop: 10 },
  totalLabel: { color: brand.ink, fontSize: 13, fontWeight: '800' },
  totalValue: { color: brand.ink, fontSize: 15, fontWeight: '900' },
  feeNote: { backgroundColor: '#FFF7E9', borderRadius: 10, marginTop: 11, padding: 10 },
  feeNoteText: { color: '#765C37', fontSize: 10, lineHeight: 15 },
  error: { color: '#B42318', fontSize: 12, fontWeight: '700', marginTop: 8 },
  submit: { alignItems: 'center', backgroundColor: brand.orangeDark, borderRadius: 12, marginTop: 16, padding: 14 },
  submitText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
