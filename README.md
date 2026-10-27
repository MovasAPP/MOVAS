# CONTRATEI

Aplicativo independente de contratação de serviços, criado para Android, iOS e web com Expo e React Native. O projeto pertence ao produto CONTRATEI, de Murilo Bueno, e não está conectado ao CRM da Steinmetz.

## Rodar localmente

Requer Node.js compatível com Expo SDK 58.

```bash
npm install
npm run start
```

No terminal do Expo, pressione `w` para abrir a versão web ou `a` para Android. Para iniciar direto na web:

```bash
npm run web
```

## O que já está na primeira versão

- Início para contratantes, com categorias e diretório real de profissionais verificados.
- Formulário para pedir orçamento com descrição, cidade, data, preço opcional, fotos opcionais e exigências de EPI, MEI e nota fiscal.
- Área de oportunidades para profissionais e formulário de proposta com cálculo ilustrativo da comissão de 10% paga pelo contratante.
- Telas de segurança/privacidade e perfil com alternância entre contratar e trabalhar.
- Navegação responsiva compartilhada entre web, Android e iOS.
- Cadastro e entrada com e-mail e senha conectados ao Supabase Auth do projeto próprio CONTRATEI.
- Confirmação de e-mail no cadastro e recuperação de senha com link de retorno compatível com Android, iOS e web.
- Publicação real de pedidos no Supabase, com fotos no bucket privado `job-photos`.
- Mural de pedidos abertos e envio de propostas no banco, respeitando as políticas RLS.
- Área do contratante para acompanhar pedidos próprios e comparar propostas, com total incluindo a taxa de 10% paga pelo contratante.
- Cadastro de perfil profissional e vários serviços por conta, com status de verificação lido do banco.
- Envio privado da frente e do verso do documento de identidade, com consentimento e status de análise.
- Fila de revisão de identidade exclusiva para membros `owner` e `verifier`, com visualização via links temporários.
- Área profissional para acompanhar o histórico de propostas enviadas e seus status.
- Checkout Mercado Pago preparado para propostas, Split 1:1 e confirmação por webhook assinado.
- Conversa privada por contratação, conclusão solicitada pelo profissional e confirmada pelo contratante.
- Avaliações disponíveis após confirmação; a descoberta pública exibe apenas média e quantidade, nunca comentários ligados a trabalhos.
- Central de notificações e fila privada para o suporte responder relatos das contratações.
- Retirada de proposta pelo trabalhador enquanto ela ainda está pendente e cancelamento de pedido aberto pelo contratante.
- Fotos dos pedidos exibidas aos profissionais verificados por links privados temporários.
- Diretório público conectado ao banco, mostrando somente serviços ativos de profissionais verificados no RS.
- Site configurado para exportação estática com metadados em português e compatibilidade com hospedagem EAS.

## Estado do produto

O cadastro, o perfil profissional, os serviços, a publicação de pedidos, o upload privado de fotos, o diretório de serviços, a lista de pedidos, as propostas, os documentos e a revisão administrativa estão conectados ao Supabase. O código local também inclui pagamento, chat, conclusão, avaliações, disputas e notificações, mas essas partes dependem das migrations 006–012 e das Edge Functions publicadas. A navegação e o diretório são públicos; publicar pedidos, enviar propostas e ver os próprios dados exige conta. Propostas e acesso a fotos dos pedidos exigem trabalhador verificado. A conta owner de revisão já está cadastrada em `staff_members`.

O esquema e as políticas RLS estão em `supabase/migrations/`. As migrations 001–005 foram executadas no projeto CONTRATEI. A regra de preço confirmada é: o trabalhador informa o valor do serviço, o cliente paga mais 10% de taxa CONTRATEI, e a tarifa de processamento do Mercado Pago é descontada do recebimento do profissional. As migrations 006–008 preparam OAuth, checkout e pagamentos; 009–010 liberam conversa, conclusão e avaliações; 011–012 acrescentam suporte e notificações; 013 permite a substituição segura de documentos de identidade; 014 impede regressão do estado do pagamento em caso de webhooks fora de ordem. As migrations 006–014 ainda precisam ser executadas. As regras públicas revelam apenas nome público, cidade, dados do serviço e agregados de avaliações de profissionais verificados; contatos, documentos, pedidos, propostas, mensagens e credenciais de recebimento continuam protegidos.

A URL e a chave publicável fornecidas foram configuradas somente no `.env.local`, que fica fora do Git. Use `.env.example` como modelo em outra máquina. Uma chave `publishable` é apropriada para o app; nunca inclua a `secret`/`service_role` no cliente.

## Atualizações do site e dos aplicativos

O site é exportado como páginas estáticas do Expo Router (`npx expo export --platform web`). Depois de associar uma conta e projeto EAS e ligar o GitHub, o fluxo em `.eas/workflows/production.yml` valida o código e, após cada envio à branch `main`, publica a versão web no EAS Hosting e uma atualização OTA no canal `production`. Mudanças que alteram código nativo ainda exigem uma nova build Android/iOS e aprovação nas lojas; `runtimeVersion` usa a versão do app para evitar aplicar atualização a uma versão incompatível.

Antes de ativar o fluxo, crie ou acesse uma conta Expo com o e-mail do Murilo, execute `npx eas-cli@latest login` e `npx eas-cli@latest update:configure` no projeto CONTRATEI. Isso cria/associa o projeto EAS e grava o `projectId` e a URL reais no `app.json`; não invente nem reutilize o ID do CRM. Configure `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` nos ambientes `preview` e `production` do EAS. Depois conecte o repositório GitHub privado nas configurações do projeto EAS para habilitar os gatilhos `push`.

O workflow `.eas/workflows/native-build.yml` cria builds de produção sob demanda. A publicação nas lojas exige contas e credenciais de desenvolvedor do Murilo; o workflow não envia builds automaticamente para as lojas. Um domínio próprio pode ser associado depois de adquirir o domínio e ativar um plano EAS com suporte a domínio personalizado. Até lá, o EAS fornece um endereço `*.expo.app`.

## Próximos itens do produto

O provedor definido é Mercado Pago Checkout Pro com Split de Pagamentos 1:1. As Edge Functions de OAuth, checkout e confirmação autenticada por webhook estão preparadas em `supabase/functions/mercado-pago-*`, mas ainda precisam ser publicadas e configuradas. O Mercado Pago exige conta de vendedor com identificação KYC 6 e cada profissional precisa autorizar a conta por OAuth. O checkout mostra o total devido pelo cliente; a tarifa de processamento é descontada do repasse do trabalhador. O app não calcula a tarifa antes do pagamento; o valor recebido pelo webhook fica salvo para conciliação posterior. O sistema registra relatos para o suporte, mas reembolsos, chargebacks e conciliação financeira continuam manuais e precisam de política operacional antes da abertura de pagamentos reais. Há uma divergência que precisa de confirmação: a documentação específica do Split 1:1 menciona saldo disponível entre contas Mercado Pago e diz que transferências de instituições financeiras externas não são permitidas, enquanto a documentação geral do Checkout Pro lista cartões, Pix e boleto. Confirme com o Mercado Pago quais métodos estão habilitados para o arranjo Marketplace / Split 1:1 escolhido e teste com contas de teste. A documentação também informa que, em reembolsos, os valores são debitados proporcionalmente das contas do vendedor e do marketplace, e o saldo do vendedor pode limitar o estorno integral. Não anuncie formas de pagamento nem aceite cobranças reais até validar os métodos e o processo de reembolso ([Split 1:1](https://www.mercadopago.com.br/developers/pt/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace), [Checkout Pro](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/overview)). Configure os segredos somente em Supabase Edge Function Secrets; nunca no app, no GitHub ou neste chat.

Para criar a aplicação Mercado Pago, use como callback OAuth `https://mzcbpilcbmpvfzgknqdg.supabase.co/functions/v1/mercado-pago-oauth-callback`. A mesma URL precisa ser registrada no painel Mercado Pago e definida como `MP_REDIRECT_URI`. Configure `MP_CLIENT_ID`, `MP_CLIENT_SECRET`, `MP_TOKEN_ENCRYPTION_KEY` (32 bytes codificados em Base64 URL-safe), `MP_WEBHOOK_SECRET` e `CONTRATEI_WEB_URL` nos segredos das Edge Functions. Registre o webhook de pagamentos apontando para `https://mzcbpilcbmpvfzgknqdg.supabase.co/functions/v1/mercado-pago-webhook`. A integração precisa ser criada no modo Marketplace / Split 1:1. Pagamentos reais só devem ser habilitados depois de aplicar as migrations 006–012, publicar as Edge Functions e validar todo o fluxo com contas de teste.

Ainda falta implementar estorno automatizado e definir regras operacionais para cancelamento, chargeback e mediação. Não colocar chaves secretas no app; manter segredos em funções de servidor.

O projeto de backend do CONTRATEI é separado do CRM da Steinmetz e está configurado localmente neste app. Não aplique a migration no projeto da Steinmetz.

## Verificações locais

```bash
npx tsc --noEmit
npx expo export --platform web
```
