# Pagamentos e assinaturas

## Escopo entregue

- Planos ativos via API.
- Checkout para pagamento avulso e assinatura.
- Cupons percentuais ou de valor fixo.
- Historico financeiro do aluno.
- Status de acesso por entitlement.
- Assinaturas com cancelamento, renovacao e status.
- Webhook Stripe idempotente com registro de evento.
- Protecao contra duplicidade de pagamentos, webhooks e recompensas de acesso.

## Endpoints

- `GET /payments/plans`
- `POST /payments/checkout`
- `GET /payments/access`
- `GET /payments/history`
- `GET /payments/subscriptions`
- `POST /payments/subscriptions/:id/cancel`
- `POST /payments/webhooks/stripe`

## Webhooks aceitos

- `checkout.session.completed`: confirma pagamento, ativa assinatura quando existir e concede acesso.
- `checkout.session.expired`: cancela pagamento pendente.
- `payment_intent.payment_failed`: marca pagamento como falho.
- `invoice.payment_failed`: marca assinatura como `PAST_DUE`.
- `invoice.payment_succeeded`: registra renovacao e estende acesso.
- `customer.subscription.updated`: sincroniza status e periodo.
- `customer.subscription.deleted`: cancela assinatura e encerra acesso.

## Consistencia

- `Payment.idempotencyKey` evita checkout duplicado no backend.
- `PaymentWebhookEvent(provider, eventId)` evita processar o mesmo webhook mais de uma vez.
- `providerPaymentId` e `providerSubscriptionId` sao unicos quando existem.
- Cupom e contabilizado como resgate no checkout, mas `redeemedCount` so aumenta apos confirmacao de pagamento.
- Entitlement de assinatura usa `source = subscription:<id>` e e atualizado na renovacao.
- Cancelamento vindo do provedor encerra entitlements ativos da assinatura.

## Segredos

Nenhum segredo foi gravado em codigo.

Variaveis lidas do ambiente:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `APP_URL`

## Frontend

A area do aluno fica em `/assinaturas`.

Ela cobre:

- escolha de plano;
- aplicacao de cupom;
- inicio de checkout;
- visualizacao do acesso ativo;
- cancelamento de assinatura;
- historico financeiro.
