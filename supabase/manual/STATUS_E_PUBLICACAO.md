# MOVA$: estado e roteiro até a publicação

Este documento separa o que está implementado no repositório do que já foi configurado nas contas externas. O app ainda não está publicado e pagamentos reais não estão habilitados.

## Estado confirmado

- O app Expo compartilhado para Android, iOS e web está no repositório GitHub `MovasAPP/MOVAS`, branch `main`.
- Confirmei o projeto conectado (`mzcbpilcbmpvfzgknqdg`) por consultas somente de leitura à API: as tabelas centrais e `worker_verification_documents` existem, compatível com o núcleo inicial e o envio de documentos. A chave do app não permite consultar o histórico de migrations para validar cada versão individualmente.
- O código local inclui autenticação, perfis, pedidos, propostas, verificação de identidade, revisão administrativa, pagamento preparado com Mercado Pago, conversas, avaliações, disputas e notificações.
- A recuperação de senha por e-mail e a tela de troca de senha agora estão no app/site; ainda precisam de configuração e validação do redirecionamento no Supabase Auth.
- As migrations 006–015 existem localmente e ainda estão pendentes. A checagem somente de leitura não encontrou `payment_provider_accounts`, `job_payments`, `job_messages`, `job_reviews`, `job_disputes` nem `user_notifications`; aplique 006–015 no SQL Editor e confira sucesso em cada execução.
- A migration 013 permite substituir documentos de identidade preservando a cópia anterior até que o novo envio seja confirmado. Ela depende da migration 002 e ainda não foi aplicada no Supabase.
- A migration 014 impede que webhooks atrasados reabram tentativas de pagamento em estado final. Ela depende da migration 008 e ainda não foi aplicada no Supabase.
- A migration 015 remove a política ampla de leitura de pedidos abertos e conserva o acesso apenas para o contratante, o profissional contratado e profissionais verificados. Ela depende das migrations 003 e 010 e ainda não foi aplicada no Supabase.
- As Edge Functions de OAuth, checkout e webhook estão no repositório, mas ainda não foram publicadas nem receberam os segredos do Mercado Pago.
- O projeto EAS `@contratei.app/contratei` está criado e associado ao `projectId` `4707f645-b53b-43cf-b9ac-466dc225a789`. A URL e a chave publicável do Supabase estão cadastradas como variáveis plaintext nos ambientes EAS `preview` e `production`.
- A build interna de preview Android 1.0.0 foi concluída no EAS (build `ffe83a7a-ddd0-4852-856d-e33e82a7b768`). O APK pode ser baixado em https://expo.dev/artifacts/eas/7j8teoF2IHcAE8xADOw14yw_iqfAvzNZ8Tct48YQ8Q4.apk; é uma build para testes, ainda não publicada na Play Store.
- A tentativa de build iOS interna foi interrompida porque o EAS não encontrou credenciais de assinatura para distribuição interna. São necessárias as credenciais Apple Developer antes de gerar uma versão instalável para iPhone.
- O repositório público `MovasAPP/MOVAS` pertence à conta MOVA$ e recebe a base compartilhada do site, Android e iOS. O arquivo local `.env.local` é ignorado e não deve ser enviado.

## Próximas etapas

### 1. Banco Supabase

No projeto `mzcbpilcbmpvfzgknqdg`, confira no SQL Editor se 006, 007 e 008 já foram executadas. Se não, rode os arquivos em `supabase/migrations/` um por vez, na ordem descrita em [EXECUTAR_MIGRATIONS_PENDENTES.md](EXECUTAR_MIGRATIONS_PENDENTES.md), e confira “Success” após cada arquivo. As migrations 009–012 também são necessárias para conclusão, chat, avaliações, suporte e notificações; aplique-as na mesma ordem antes de liberar esses recursos.

Em Authentication → URL Configuration, adicione `contratei://auth-callback` e `contratei://reset-password` à lista de URLs de redirecionamento autorizadas. Depois que o endereço web de produção existir, adicione também `https://SEU-DOMINIO/auth-callback` e `https://SEU-DOMINIO/reset-password` (ou os endereços EAS reais) e configure o Site URL para a URL principal do MOVA$. Não deixe curingas amplos em produção. A confirmação de cadastro e a recuperação de senha usam e-mail; configure SMTP próprio e teste os dois fluxos.

### 2. Edge Functions e Mercado Pago

Publique as funções existentes em `supabase/functions/` no projeto MOVA$. Configure os segredos apenas em Supabase → Edge Functions → Secrets:

- `MP_CLIENT_ID`
- `MP_CLIENT_SECRET`
- `MP_TOKEN_ENCRYPTION_KEY`
- `MP_WEBHOOK_SECRET`
- `MP_REDIRECT_URI`
- `CONTRATEI_WEB_URL`

Cadastre no Mercado Pago o callback OAuth e a URL do webhook descritos no README. Faça primeiro a validação com contas de teste, incluindo autorização OAuth, abertura do Checkout Pro, confirmação por webhook, tarifa, repasse, cancelamento e reembolso. A compatibilidade de meios de pagamento com Split 1:1 e a operação de estornos precisam ser confirmadas com o Mercado Pago antes de cobrança real.

### 3. GitHub

O código do site e dos apps está no repositório `MovasAPP/MOVAS`. O repositório é público, conforme escolha do Murilo. Nunca enviar `.env.local` ou credenciais secretas. Os workflows de publicação só devem ser ativados depois de configurar Supabase e EAS.

### 4. EAS, site e apps

O projeto EAS e as variáveis de ambiente já estão configurados. Para ativar os workflows versionados em `.eas/workflows/`, conecte o repositório `MovasAPP/MOVAS` ao projeto EAS. O fluxo publica o site e envia atualização OTA compatível depois de um push na branch `main`.

O workflow de produção prepara a publicação do site e uma atualização OTA compatível. Alterações que mudem código nativo exigem nova build Android/iOS e publicação/validação nas lojas. Para isso, serão necessárias as contas de desenvolvedor Google Play e Apple Developer, além de credenciais de assinatura. Um domínio próprio é opcional; primeiro é possível publicar no domínio EAS.

### 5. Teste de ponta a ponta antes do lançamento

Validar cadastro e login, criação de perfil profissional, envio e revisão de documentos, publicação de pedido com fotos, proposta, aceite, checkout de teste, webhook, chat, conclusão, avaliação, notificações, autorização de acesso e comportamento de cancelamentos. Confirmar que contas comuns não acessam documentos de terceiros nem ferramentas administrativas.

## Proteção de segredos

Não coloque `service_role`, senha do banco, tokens OAuth, segredo de webhook ou chave privada no app, no GitHub, em mensagens ou no `.env` versionado. O app cliente usa apenas a chave publicável; credenciais privadas ficam no armazenamento de secrets do Supabase.
