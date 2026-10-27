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

- Início para contratantes, com categorias e profissionais de demonstração.
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
- Site configurado para exportação estática com metadados em português e compatibilidade com hospedagem EAS.

## Estado do produto

O cadastro, o perfil profissional, os serviços, a publicação de pedidos, o upload privado de fotos, a listagem dos pedidos, a criação de propostas, o envio de documentos e a fila administrativa de revisão estão conectados ao Supabase. Os profissionais mostrados na página inicial continuam sendo exemplos visuais. Propostas exigem perfil profissional verificado. O primeiro usuário da equipe de revisão precisa ser cadastrado manualmente em `staff_members` usando o modelo em `supabase/manual/seed_first_owner.sql`. Notificações, chat e pagamentos não estão conectados.

O esquema e as políticas RLS estão em `supabase/migrations/`. As migrations cobrem perfis, contatos privados, categorias, serviços, pedidos, fotos privadas, propostas e documentos de verificação privados. As migrations inicial e de documentos foram executadas no projeto CONTRATEI. O acesso exige sessão autenticada; as políticas RLS limitam cada ação ao usuário ou à equipe de verificação autorizada.

A URL e a chave publicável fornecidas foram configuradas somente no `.env.local`, que fica fora do Git. Use `.env.example` como modelo em outra máquina. Uma chave `publishable` é apropriada para o app; nunca inclua a `secret`/`service_role` no cliente.

## Atualizações do site e dos aplicativos

O site é exportado como páginas estáticas do Expo Router (`npx expo export --platform web`). Depois de associar uma conta e projeto EAS e ligar o GitHub, o fluxo em `.eas/workflows/production.yml` valida o código e, após cada envio à branch `main`, publica a versão web no EAS Hosting e uma atualização OTA no canal `production`. Mudanças que alteram código nativo ainda exigem uma nova build Android/iOS e aprovação nas lojas; `runtimeVersion` usa a versão do app para evitar aplicar atualização a uma versão incompatível.

Antes de ativar o fluxo, crie ou acesse uma conta Expo com o e-mail do Murilo, execute `npx eas-cli@latest login` e `npx eas-cli@latest update:configure` no projeto CONTRATEI. Isso cria/associa o projeto EAS e grava o `projectId` e a URL reais no `app.json`; não invente nem reutilize o ID do CRM. Configure `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` nos ambientes `preview` e `production` do EAS. Depois conecte o repositório GitHub privado nas configurações do projeto EAS para habilitar os gatilhos `push`.

O workflow `.eas/workflows/native-build.yml` cria builds de produção sob demanda. A publicação nas lojas exige contas e credenciais de desenvolvedor do Murilo; o workflow não envia builds automaticamente para as lojas. Um domínio próprio pode ser associado depois de adquirir o domínio e ativar um plano EAS com suporte a domínio personalizado. Até lá, o EAS fornece um endereço `*.expo.app`.

## Próximos itens do produto

Escolha/aceite de propostas, regras de cancelamento e disputa, pagamentos de marketplace, chat e notificações ainda dependem das regras comerciais e da configuração de um provedor de pagamentos. Não colocar chaves secretas no app; usar variáveis públicas somente para chaves publishable e manter segredos em funções de servidor.

O projeto de backend do CONTRATEI é separado do CRM da Steinmetz e está configurado localmente neste app. Não aplique a migration no projeto da Steinmetz.

## Verificações locais

```bash
npx tsc --noEmit
npx expo export --platform web
```
