import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { brand } from '@/constants/brand';
import { getAuthRedirectUrl } from '@/lib/auth-links';
import { supabase } from '@/lib/supabase';

type Props = { visible: boolean; onClose: () => void };

export function AuthModal({ visible, onClose }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'recover'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  async function submit() {
    setError('');
    if (mode === 'signup' && name.trim().length < 2) return setError('Informe seu nome.');
    if (!email.trim()) return setError('Informe seu e-mail.');
    if (mode !== 'recover' && password.length < 8) return setError('Use uma senha com pelo menos 8 caracteres.');

    setBusy(true);
    try {
      if (mode === 'recover') {
        const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: getAuthRedirectUrl('reset-password') });
        if (recoveryError) throw recoveryError;
        setRecoverySent(true);
      } else if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { data: { public_name: name.trim() }, emailRedirectTo: getAuthRedirectUrl('auth-callback') },
        });
        if (signUpError) throw signUpError;
        if (data.session) onClose();
        else setConfirmationSent(true);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (signInError) throw signInError;
        onClose();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível concluir. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: 'signin' | 'signup' | 'recover') {
    setMode(next);
    setError('');
    setConfirmationSent(false);
    setRecoverySent(false);
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
          <View style={styles.sheet}>
            <View style={styles.heading}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>MOVA$ · CONTA PESSOAL</Text>
                <Text style={styles.title}>{confirmationSent ? 'Confira seu e-mail' : recoverySent ? 'Confira sua caixa de entrada' : mode === 'recover' ? 'Recupere sua senha' : mode === 'signin' ? 'Que bom ter você de volta' : 'Crie sua conta'}</Text>
                <Text style={styles.subtitle}>
                  {confirmationSent ? `Enviamos um link de confirmação para ${email}. Depois, volte aqui para entrar.` : recoverySent ? 'Se houver uma conta com esse e-mail, enviaremos um link seguro para criar outra senha.' : mode === 'recover' ? 'Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.' : 'A mesma conta serve para contratar e trabalhar.'}
                </Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
            </View>
            {confirmationSent ? (
              <View style={styles.confirmationBox}>
                <Text style={styles.confirmationText}>Abra o link para confirmar seu e-mail. No celular, ele volta ao app; no site, volta ao MOVA$. Não compartilhe esse link.</Text>
                <Pressable onPress={() => switchMode('signin')} style={styles.submit}><Text style={styles.submitText}>Já confirmei · entrar</Text></Pressable>
              </View>
            ) : recoverySent ? (
              <View style={styles.confirmationBox}>
                <Text style={styles.confirmationText}>Abra o link no mesmo dispositivo onde o MOVA$ está instalado. No site, o link abrirá a tela para criar uma nova senha.</Text>
                <Pressable onPress={() => switchMode('signin')} style={styles.submit}><Text style={styles.submitText}>Voltar para entrar</Text></Pressable>
              </View>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {mode === 'signup' ? <Field label="Nome" value={name} onChangeText={setName} placeholder="Como podemos chamar você?" autoCapitalize="words" /> : null}
                <Field label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@email.com" keyboardType="email-address" autoCapitalize="none" />
                {mode !== 'recover' ? <Field label="Senha" value={password} onChangeText={setPassword} placeholder="Pelo menos 8 caracteres" secureTextEntry /> : null}
                {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
                <Pressable disabled={busy} onPress={submit} style={[styles.submit, busy && styles.submitDisabled]}>
                  <Text style={styles.submitText}>{busy ? 'Aguarde…' : mode === 'signin' ? 'Entrar' : mode === 'recover' ? 'Enviar link de recuperação' : 'Criar conta'}</Text>
                </Pressable>
                {mode === 'signin' ? <Pressable onPress={() => switchMode('recover')} style={styles.forgotButton}><Text style={styles.forgotText}>Esqueci minha senha</Text></Pressable> : null}
                <View style={styles.modeSwitch}>
                  <Text style={styles.switchPrompt}>{mode === 'signup' ? 'Já tem uma conta?' : mode === 'recover' ? 'Lembrou sua senha?' : 'Ainda não tem conta?'}</Text>
                  <Pressable onPress={() => switchMode(mode === 'signup' ? 'signin' : mode === 'recover' ? 'signin' : 'signup')}>
                    <Text style={styles.switchAction}>{mode === 'signup' || mode === 'recover' ? 'Entrar' : 'Criar conta'}</Text>
                  </Pressable>
                </View>
                {mode !== 'recover' ? <Text style={styles.note}>Cadastro protegido pelo Supabase Auth. Use seu e-mail pessoal; documentos de identidade não são solicitados nesta etapa.</Text> : null}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} placeholderTextColor="#87938E" style={styles.input} autoCorrect={false} /></View>;
}

const styles = StyleSheet.create({
  backdrop: { alignItems: 'center', backgroundColor: Platform.OS === 'web' ? '#292B28B8' : '#10221FD8', flex: 1, justifyContent: 'center', padding: 14 },
  wrap: { maxHeight: '90%', width: '100%', maxWidth: 480 },
  sheet: { backgroundColor: brand.surface, borderRadius: Platform.OS === 'web' ? 3 : 22, maxHeight: '100%', padding: 22 },
  heading: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, marginBottom: 12 },
  eyebrow: { color: brand.orangeDark, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: brand.ink, fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginTop: 7 },
  subtitle: { color: brand.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  close: { alignItems: 'center', backgroundColor: '#F2F4F2', borderRadius: 18, height: 35, justifyContent: 'center', width: 35 },
  closeText: { color: brand.ink, fontSize: 23, lineHeight: 27 },
  field: { marginTop: 12 },
  label: { color: brand.ink, fontSize: 11, fontWeight: '800', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: Platform.OS === 'web' ? 2 : 11, borderWidth: 1, color: brand.ink, fontSize: 14, minHeight: 46, paddingHorizontal: 12 },
  error: { color: '#B42318', fontSize: 11, fontWeight: '700', marginTop: 10 },
  confirmationBox: { backgroundColor: brand.successSoft, borderRadius: 13, padding: 14 },
  confirmationText: { color: brand.success, fontSize: 12, lineHeight: 18 },
  submit: { alignItems: 'center', backgroundColor: brand.orangeDark, borderRadius: Platform.OS === 'web' ? 2 : 12, marginTop: 16, padding: 14 },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  forgotButton: { alignSelf: 'center', marginTop: 12, padding: 4 },
  forgotText: { color: brand.orangeDark, fontSize: 11, fontWeight: '800' },
  modeSwitch: { alignItems: 'center', flexDirection: 'row', gap: 5, justifyContent: 'center', marginTop: 14 },
  switchPrompt: { color: brand.muted, fontSize: 11 },
  switchAction: { color: brand.orangeDark, fontSize: 11, fontWeight: '800' },
  note: { color: brand.muted, fontSize: 9, lineHeight: 15, marginBottom: 3, marginTop: 15, textAlign: 'center' },
});

