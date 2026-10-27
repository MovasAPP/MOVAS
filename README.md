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
- Publicação real de pedidos no Supabase, com fotos no bucket privado `job-photos`.
- Mural de pedidos abertos e envio de propostas no banco, respeitando as políticas RLS.
- Área do contratante para acompanhar pedidos próprios e comparar as propostas recebidas, incluindo a taxa de 10% e o total estimado.
- Cadastro de perfil profissional e vários serviços por conta, com status de verificação lido do banco.
- Envio privado da frente e do verso do documento de identidade, com consentimento e status de análise.
- Fila de revisão de identidade exclusiva para membros `owner` e `verifier`, com visualização via links temporários.
- Área profissional para acompanhar o histórico de propostas enviadas e seus status.
- Retirada de proposta pelo trabalhador enquanto ela ainda está pendente e cancelamento de pedido aberto pelo contratante.
- Fotos dos pedidos exibidas aos profissionais verificados por links privados temporários.
- Diretório público conectado ao banco, mostrando somente serviços ativos de profissionais verificados no RS.
- Site configurado para exportação estática com metadados em português e compatibilidade com hospedagem EAS.

## Estado do produto

O cadastro, o perfil profissional, os serviços, a publicação de pedidos, o upload privado de fotos, o diretório de serviços, a lista de pedidos, as propostas, os documentos e a revisão administrativa estão conectados ao Supabase. A navegação e o diretório são públicos; publicar pedidos, enviar propostas e ver os próprios dados exige conta. Propostas e acesso a fotos dos pedidos exigem trabalhador verificado. A conta owner de revisão já está cadastrada em `staff_members`. Notificações, chat e pagamentos ainda não estão conectados.

O esquema e as políticas RLS estão em `supabase/migrations/`. As migrations 001–005 foram executadas no projeto CONTRATEI. As regras públicas revelam apenas nome público, cidade e dados do serviço de profissionais verificados; contatos pessoais, documentos, pedidos e propostas continuam protegidos. As demais ações seguem as políticas RLS para usuário proprietário, trabalhador verificado ou equipe de revisão.

A URL e a chave publicável fornecidas foram configuradas somente no `.env.local`, que fica fora do Git. Use `.env.example` como modelo em outra máquina. Uma chave `publishable` é apropriada para o app; nunca inclua a `secret`/`service_role` no cliente.

## Atualizações do site e dos aplicativos

O site é exportado como páginas estáticas do Expo Router (`npx expo export --platform web`). Depois de associar uma conta e projeto EAS e ligar o GitHub, o fluxo em `.eas/workflows/production.yml` valida o código e, após cada envio à branch `main`, publica a versão web no EAS Hosting e uma atualização OTA no canal `production`. Mudanças que alteram código nativo ainda exigem uma nova build Android/iOS e aprovação nas lojas; `runtimeVersion` usa a versão do app para evitar aplicar atualização a uma versão incompatível.

Antes de ativar o fluxo, crie ou acesse uma conta Expo com o e-mail do Murilo, execute `npx eas-cli@latest login` e `npx eas-cli@latest update:configure` no projeto CONTRATEI. Isso cria/associa o projeto EAS e grava o `projectId` e a URL reais no `app.json`; não invente nem reutilize o ID do CRM. Configure `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` nos ambientes `preview` e `production` do EAS. Depois conecte o repositório GitHub privado nas configurações do projeto EAS para habilitar os gatilhos `push`.

O workflow `.eas/workflows/native-build.yml` cria builds de produção sob demanda. A publicação nas lojas exige contas e credenciais de desenvolvedor do Murilo; o workflow não envia builds automaticamente para as lojas. Um domínio próprio pode ser associado depois de adquirir o domínio e ativar um plano EAS com suporte a domínio personalizado. Até lá, o EAS fornece um endereço `*.expo.app`.

## Próximos itens do produto

Aceitar uma proposta e iniciar uma contratação ainda não está conectado a pagamento. Também faltam regras completas de cancelamento e disputa, chat, notificações e avaliações. Integração com marketplace de pagamentos depende da definição do provedor e da configuração das contas comerciais. Não colocar chaves secretas no app; manter segredos em funções de servidor.

O projeto de backend do CONTRATEI é separado do CRM da Steinmetz e está configurado localmente neste app. Não aplique a migration no projeto da Steinmetz.

## Verificações locais

```bash
npx tsc --noEmit
npx expo export --platform web
```
