# Atualizar o banco CONTRATEI

Execute estes arquivos **um por vez e nesta ordem** no SQL Editor do projeto Supabase `mzcbpilcbmpvfzgknqdg`. Não use o projeto do CRM Steinmetz. As migrations 001–005 já foram executadas.

1. `migrations/20261027000600_mercado_pago_seller_connections.sql`
2. `migrations/20261027000700_add_awaiting_payment_job_status.sql`
3. `migrations/20261027000800_checkout_and_payment_webhooks.sql`
4. `migrations/20261027000900_add_completion_pending_status.sql`
5. `migrations/20261027001000_chat_completion_and_reviews.sql`
6. `migrations/20261027001100_job_disputes.sql`
7. `migrations/20261027001200_in_app_notifications.sql`
8. `migrations/20261027001300_safe_identity_document_replacement.sql`
9. `migrations/20261027001400_prevent_payment_status_regression.sql`

Para cada arquivo: abra-o no repositório, copie todo o conteúdo, cole em uma consulta nova no SQL Editor e execute. Confirme que aparece sucesso antes de seguir para o próximo. Os arquivos 007 e 009 adicionam valores a enums; por isso devem ficar em consultas separadas e ser executados antes dos arquivos seguintes.

As migrations são aditivas e não apagam registros atuais. Elas criam estruturas de pagamento, chat, conclusão, avaliações, suporte, notificações, atualização segura de fotos de documentos e proteção contra notificações de pagamento fora de ordem, além de regras de acesso. O checkout ainda não processa cobranças até as Edge Functions e os segredos do Mercado Pago serem configurados.

Não cole senhas, `service_role`, chaves secretas ou tokens em arquivos versionados ou neste chat.
