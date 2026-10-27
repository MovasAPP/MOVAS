import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BrandHeader } from '@/components/BrandHeader';
import { Page } from '@/components/Page';
import { SectionTitle } from '@/components/SectionTitle';
import { brand } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { getProfessionalProfile, type ProfessionalProfile } from '@/lib/marketplace';

export default function SafetyScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) {
      return () => { active = false; };
    }
    void getProfessionalProfile(user.id).then((next) => {
      if (active) {
        setProfile(next);
        setProfileUserId(user.id);
      }
    }).catch(() => {
      if (active) {
        setProfile(null);
        setProfileUserId(user.id);
      }
    });
    return () => { active = false; };
  }, [user]);

  const statusCopy = {
    not_submitted: 'Não enviada',
    pending: 'Em análise',
    verified: 'Aprovada',
    rejected: 'Precisa de novas fotos',
  } as const;
  const status = !user ? 'Entre para acompanhar' : profileUserId !== user.id ? 'Carregando…' : statusCopy[profile?.verificationStatus ?? 'not_submitted'];

  return (
    <View style={styles.screen}>
      <BrandHeader mode="hire" />
      <Page>
        <Text style={styles.eyebrow}>SEGURANÇA E PRIVACIDADE</Text>
        <Text style={styles.title}>Confiança em cada etapa.</Text>
        <Text style={styles.lead}>Profissionais enviam a frente e o verso do documento com foto para análise manual. Os arquivos são privados e não aparecem no perfil público.</Text>
        <View style={styles.card}>
          <VerificationRow icon="✉" title="E-mail da conta" text="A conta usa confirmação por e-mail do Supabase Auth." status={user?.email_confirmed_at ? 'CONFIRMADO' : user ? 'PENDENTE' : '—'} />
          <VerificationRow icon="▣" title="Documento com foto" text="Envie frente e verso para a equipe CONTRATEI analisar. Não usamos um serviço automático de validação." status={status.toUpperCase()} />
          <VerificationRow icon="☆" title="Qualificação profissional" text="Certificados e habilitações específicos ainda não são validados pelo aplicativo." status="NÃO VALIDADO" />
        </View>
        <SectionTitle title="Como protegemos seus dados" subtitle="O que está implementado na versão atual." />
        <View style={styles.protectionGrid}>
          <Protection icon="🔒" title="Documentos privados" text="O bucket é privado. O trabalhador e revisores autorizados podem acessar; links temporários expiram." />
          <Protection icon="🧾" title="Exigências visíveis" text="EPI, MEI e nota fiscal aparecem antes de o profissional enviar proposta." />
          <Protection icon="👁" title="Revisão manual" text="A aprovação confirma apenas a análise feita pela equipe; não é consulta a antecedentes nem prova de vida." />
          <Protection icon="🚧" title="Recursos em desenvolvimento" text="Denúncias, bloqueio, avaliações e canal de suporte ainda não estão disponíveis." />
        </View>
        <Pressable onPress={() => router.push('/profile')} style={styles.button}>
          <Text style={styles.buttonText}>Ver meu perfil e documentos</Text>
        </Pressable>
        <Text style={styles.disclaimer}>Envie somente imagens do próprio documento e evite incluir dados pessoais nas fotos dos serviços. Antes da abertura pública, as regras de retenção, exclusão e suporte precisam estar descritas na política de privacidade do CONTRATEI.</Text>
      </Page>
    </View>
  );
}

function VerificationRow({ icon, title, text, status }: { icon: string; title: string; text: string; status: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}><Text style={styles.rowIconText}>{icon}</Text></View>
      <View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowText}>{text}</Text></View>
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

function Protection({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <View style={styles.protection}><Text style={styles.protectionIcon}>{icon}</Text><Text style={styles.protectionTitle}>{title}</Text><Text style={styles.protectionText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: brand.background, flex: 1 },
  eyebrow: { color: brand.orangeDark, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 30 },
  title: { color: brand.ink, fontSize: 37, fontWeight: '900', letterSpacing: -1.4, marginTop: 8 },
  lead: { color: brand.muted, fontSize: 14, lineHeight: 22, marginTop: 9, maxWidth: 650 },
  card: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 18, borderWidth: 1, marginTop: 22, maxWidth: 850, paddingHorizontal: 17, width: '100%' },
  row: { alignItems: 'center', borderBottomColor: brand.border, borderBottomWidth: 1, flexDirection: 'row', gap: 12, minHeight: 82, paddingVertical: 13 },
  rowIcon: { alignItems: 'center', backgroundColor: brand.successSoft, borderRadius: 12, height: 37, justifyContent: 'center', width: 37 },
  rowIconText: { color: brand.success, fontSize: 17, fontWeight: '800' },
  rowCopy: { flex: 1 },
  rowTitle: { color: brand.ink, fontSize: 12, fontWeight: '800' },
  rowText: { color: brand.muted, fontSize: 10, lineHeight: 15, marginTop: 4, maxWidth: 480 },
  status: { backgroundColor: '#F2F4F2', borderRadius: 99, color: '#64716C', fontSize: 8, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5 },
  protectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  protection: { backgroundColor: '#fff', borderColor: brand.border, borderRadius: 14, borderWidth: 1, flexGrow: 1, maxWidth: 420, minHeight: 128, minWidth: 220, padding: 14 },
  protectionIcon: { fontSize: 18 },
  protectionTitle: { color: brand.ink, fontSize: 12, fontWeight: '800', marginTop: 9 },
  protectionText: { color: brand.muted, fontSize: 10, lineHeight: 15, marginTop: 5 },
  button: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: brand.orange, borderRadius: 11, marginTop: 18, paddingHorizontal: 16, paddingVertical: 12 },
  buttonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  disclaimer: { color: brand.muted, fontSize: 9, lineHeight: 14, marginBottom: 20, marginTop: 9, maxWidth: 700 },
});
