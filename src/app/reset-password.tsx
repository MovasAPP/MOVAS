import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';

import { BrandHeader } from '@/components/BrandHeader';
import { Page } from '@/components/Page';
import { brand } from '@/constants/brand';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const linkingUrl = Linking.useLinkingURL();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    async function prepareRecoverySession() {
      if (linkingUrl && linkingUrl.startsWith('contratei://')) {
        try {
          const url = new URL(linkingUrl);
          const code = url.searchParams.get('code');
          if (code) {
            const { data: current } = await supabase.auth.getSession();
            if (!current.session) {
              const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
              if (exchangeError) throw exchangeError;
            }
          }
        } catch (caught) {
          if (active) setError(caught instanceof Error ? caught.message : 'Este link não é válido ou já expirou. Solicite outro e-mail.');
        }
      }
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (active) {
        if (sessionError) setError('Não foi possível validar este link. Solicite uma nova recuperação de senha.');
        else if (!data.session) setError('Abra o link enviado por e-mail para criar uma nova senha. Se expirou, solicite outro link.');
        setReady(true);
      }
    }
    void prepareRecoverySession();
    return () => { active = false; };
  }, [linkingUrl]);

  async function savePassword() {
    setError('');
    setNotice('');
    if (password.length < 8) { setError('Use uma senha com pelo menos 8 caracteres.'); return; }
    if (password !== confirmation) { setError('As senhas não são iguais.'); return; }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setNotice('Senha atualizada. Você já pode continuar usando sua conta.');
      setPassword('');
      setConfirmation('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível atualizar a senha. Solicite um novo link.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <BrandHeader mode="hire" />
      <Page>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>CONTA SEGURA</Text>
          <Text style={styles.title}>Crie uma nova senha</Text>
          <Text style={styles.body}>Escolha uma senha com pelo menos 8 caracteres. O link de recuperação é pessoal e expira.</Text>
          {!ready ? <Text style={styles.body}>Validando seu link…</Text> : null}
          {ready && !error && !notice ? <>
            <Text style={styles.label}>Nova senha</Text>
            <TextInput autoCapitalize="none" autoComplete="new-password" onChangeText={setPassword} placeholder="Pelo menos 8 caracteres" placeholderTextColor="#87938E" secureTextEntry style={styles.input} value={password} />
            <Text style={styles.label}>Confirme a nova senha</Text>
            <TextInput autoCapitalize="none" autoComplete="new-password" onChangeText={setConfirmation} placeholder="Digite novamente" placeholderTextColor="#87938E" secureTextEntry style={styles.input} value={confirmation} />
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void savePassword()} style={[styles.button, busy && styles.disabled]}>
              <Text style={styles.buttonText}>{busy ? 'Salvando…' : 'Atualizar senha'}</Text>
            </Pressable>
          </> : null}
          {notice ? <Text accessibilityRole="status" style={styles.notice}>{notice}</Text> : null}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Pressable onPress={() => router.replace('/')} style={styles.backButton}><Text style={styles.backText}>Voltar ao início</Text></Pressable>
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
  body: { color: brand.muted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  label: { color: brand.ink, fontSize: 11, fontWeight: '800', marginTop: 14 },
  input: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 11, borderWidth: 1, color: brand.ink, fontSize: 14, minHeight: 46, marginTop: 6, paddingHorizontal: 12 },
  button: { alignItems: 'center', backgroundColor: brand.orange, borderRadius: 11, marginTop: 18, padding: 13 },
  buttonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  disabled: { opacity: 0.6 },
  notice: { color: brand.success, fontSize: 12, fontWeight: '700', lineHeight: 18, marginTop: 14 },
  error: { color: '#B42318', fontSize: 11, lineHeight: 17, marginTop: 14 },
  backButton: { alignSelf: 'flex-start', marginTop: 18, padding: 5 },
  backText: { color: brand.orangeDark, fontSize: 11, fontWeight: '800' },
});
