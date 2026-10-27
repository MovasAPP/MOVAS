# CONTRATEI: estado e roteiro até a publicação

Este documento separa o que está implementado no repositório do que já foi configurado nas contas externas. O app ainda não está publicado e pagamentos reais não estão habilitados.

## Estado confirmado

- O app Expo para Android, iOS e web está no repositório local `Contratei`, branch `main`.
- As migrations 001–005 foram executadas no projeto Supabase CONTRATEI, conforme o histórico do projeto.
- O código local inclui autenticação, perfis, pedidos, propostas, verificação de identidade, revisão administrativa, pagamento preparado com Mercado Pago, conversas, avaliações, disputas e notificações.
- A recuperação de senha por e-mail e a tela de troca de senha agora estão no app/site; ainda precisam de configuração e validação do redirecionamento no Supabase Auth.
- As migrations 006–014 existem localmente. A migration 008 ainda não foi confirmada no banco: a API do projeto retornou que `public.job_payments` não existe. Não considerar 006–008 aplicadas até verificar sucesso no SQL Editor.
- A migration 013 permite substituir documentos de identidade preservando a cópia anterior até que o novo envio seja confirmado. Ela depende da migration 002 e ainda não foi aplicada no Supabase.
- A migration 014 impede que webhooks atrasados reabram tentativas de pagamento em estado final. Ela depende da migration 008 e ainda não foi aplicada no Supabase.
- As Edge Functions de OAuth, checkout e webhook estão no repositório, mas ainda não foram publicadas nem receberam os segredos do Mercado Pago.
- O app não tem `projectId` EAS configurado; os fluxos de publicação em `.eas/workflows/` ainda não estão ativos.
- O acesso GitHub conectado não correspondeu ao proprietário do repositório privado, então não foi possível confirmar o acesso para enviar alterações. Nenhum push ou deploy foi feito.

## Próximas etapas

### 1. Banco Supabase

No projeto `mzcbpilcbmpvfzgknqdg`, confira no SQL Editor se 006, 007 e 008 já foram executadas. Se não, rode os arquivos em `supabase/migrations/` um por vez, na ordem descrita em [EXECUTAR_MIGRATIONS_PENDENTES.md](EXECUTAR_MIGRATIONS_PENDENTES.md), e confira “Success” após cada arquivo. As migrations 009–012 também são necessárias para conclusão, chat, avaliações, suporte e notificações; aplique-as na mesma ordem antes de liberar esses recursos.

Em Authentication → URL Configuration, adicione `contratei://auth-callback` e `contratei://reset-password` à lista de URLs de redirecionamento autorizadas. Depois que o endereço web de produção existir, adicione também `https://SEU-DOMINIO/auth-callback` e `https://SEU-DOMINIO/reset-password` (ou os endereços EAS reais) e configure o Site URL para a URL principal do CONTRATEI. Não deixe curingas amplos em produção. A confirmação de cadastro e a recuperação de senha usam e-mail; configure SMTP próprio e teste os dois fluxos.

### 2. Edge Functions e Mercado Pago

Publique as funções existentes em `supabase/functions/` no projeto CONTRATEI. Configure os segredos apenas em Supabase → Edge Functions → Secrets:

- `MP_CLIENT_ID`
- `MP_CLIENT_SECRET`
- `MP_TOKEN_ENCRYPTION_KEY`
- `MP_WEBHOOK_SECRET`
- `MP_REDIRECT_URI`
- `CONTRATEI_WEB_URL`

Cadastre no Mercado Pago o callback OAuth e a URL do webhook descritos no README. Faça primeiro a validação com contas de teste, incluindo autorização OAuth, abertura do Checkout Pro, confirmação por webhook, tarifa, repasse, cancelamento e reembolso. A compatibilidade de meios de pagamento com Split 1:1 e a operação de estornos precisam ser confirmadas com o Mercado Pago antes de cobrança real.

### 3. GitHub privado

Reconecte a integração GitHub à conta que possui o repositório privado `murilobuenocontratei/Contratei` e confirme que o repositório está autorizado. Depois disso, enviar commits à `main` pode disparar os workflows de publicação; por isso, primeiro configure Supabase e EAS.

### 4. EAS, site e apps

Entre no EAS com a conta própria do CONTRATEI, associe este projeto e configure o `projectId` no `app.json`. Cadastre `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` nos ambientes `preview` e `production`. Conecte o GitHub privado ao EAS para ativar os workflows versionados em `.eas/workflows/`.

O workflow de produção prepara a publicação do site e uma atualização OTA compatível. Alterações que mudem código nativo exigem nova build Android/iOS e publicação/validação nas lojas. Para isso, serão necessárias as contas de desenvolvedor Google Play e Apple Developer, além de credenciais de assinatura. Um domínio próprio é opcional; primeiro é possível publicar no domínio EAS.

### 5. Teste de ponta a ponta antes do lançamento

Validar cadastro e login, criação de perfil profissional, envio e revisão de documentos, publicação de pedido com fotos, proposta, aceite, checkout de teste, webhook, chat, conclusão, avaliação, notificações, autorização de acesso e comportamento de cancelamentos. Confirmar que contas comuns não acessam documentos de terceiros nem ferramentas administrativas.

## Proteção de segredos

Não coloque `service_role`, senha do banco, tokens OAuth, segredo de webhook ou chave privada no app, no GitHub, em mensagens ou no `.env` versionado. O app cliente usa apenas a chave publicável; credenciais privadas ficam no armazenamento de secrets do Supabase.
