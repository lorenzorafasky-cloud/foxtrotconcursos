# Diagnóstico v4 — auditoria adversarial (07/08/2026)

Este diagnóstico é diferente dos anteriores. O v3 foi escrito logo depois de eu implementar as mudanças, o que o torna vulnerável ao mesmo viés que critiquei no relatório da IA anterior: quem implementa tende a relatar a intenção, não o resultado. Aqui reli o código com olhos frios, procurando **regressões, bugs e riscos que eu mesmo introduzi**. Encontrei quatro problemas reais. Três já estão corrigidos.

## Problemas encontrados no meu próprio código

### 1. Upvote quebrado na própria resposta recém-publicada — CORRIGIDO

Ao publicar uma resposta na questão, a UI inseria o item na lista com um id sintético (`local-1754...`). Se o aluno clicasse em "útil" na própria resposta antes de recarregar, a chamada iria para um id inexistente e retornaria 404. Agora a UI usa o id real devolvido pela API.

**Severidade:** baixa (só afetava a própria resposta antes do reload), mas era um erro silencioso — o tipo que passa despercebido em teste manual rápido.

### 2. E-mail de notificação sem opt-out — CORRIGIDO

Eu havia plugado envio de e-mail via Resend em **toda** notificação criada, sem nenhuma forma de o aluno desativar. Com 7 pontos de criação de notificação no código (conquista, desafio, ofensiva, dúvida respondida etc.), isso vira caixa de entrada cheia — e, mais sério, contraria a Seção 15 (LGPD): comunicação transacional recorrente precisa de opt-out do titular.

Adicionei `emailNotifications` (default true) no usuário, incluí na mesma migration ainda não aplicada e o worker agora respeita a preferência: a notificação no app continua, o e-mail não sai.

### 3. Guardião de ofensiva com custo O(n) — CORRIGIDO

A primeira versão buscava todos os usuários com congelamento disponível e disparava 3 consultas por usuário. Com 10 mil alunos seriam ~30 mil consultas por execução diária. Reescrevi para 3 consultas agregadas com `distinct` que já devolvem os conjuntos de usuários ativos ontem/anteontem — o loop só percorre os realmente elegíveis, normalmente uma fração mínima da base.

### 4. Transcrição de aulas longas — NÃO CORRIGIDO (decisão consciente)

O worker baixa o MP4 inteiro e manda em base64 para o Workers AI. Para aulas de concurso (frequentemente 60–90 min) isso provavelmente estoura limites de payload e memória. A correção certa é extrair só a faixa de áudio e fatiar em blocos — o que exige ffmpeg no container do worker, uma decisão de infraestrutura que não cabe tomar sozinho. **Fica registrado como o principal risco técnico em aberto**, e deve ser a primeira coisa validada no teste de staging.

## O que verifiquei e está correto

- **Sem código duplicado** nos painéis: `page.tsx` virou wrapper de 5 linhas, o painel vive em `components/` (1005 e 1070 linhas), `"use client"` preservado.
- **Rotas conferem com as abas**: 9 no professor, 12 no admin, todas com pasta e página próprias.
- **Sem conflito de rotas na API**: `POST /questions/answers/:id/upvote` tem 3 segmentos e não colide com `:id/answers` nem com `@Get(":id")`.
- **Deep-link direto funciona**: abrir `/usuarios` monta o painel já na aba certa e dispara o carregamento correspondente (não é só cosmético na URL).
- **Migration ordenada**: `CREATE EXTENSION vector` vem antes de qualquer uso do tipo.
- **`upsertJobScheduler` existe** na versão de BullMQ declarada (^5.34).
- **Voto sem duplicidade** garantido por chave primária composta, não por lógica de aplicação.

## Estado de equiparação (inalterado desde o v3, ~88%)

As correções acima não mudam percentuais de seção — corrigem defeitos dentro do que já estava implementado. A matriz do v3 continua válida.

O que ainda separa o projeto do "100% pronto para produção" não é código não escrito, e sim **validação com serviços reais**:

| Bloqueio | Como resolver |
|---|---|
| Migration pgvector nunca rodou | `pnpm db:migrate` no Neon |
| Terraform nunca validado | `terraform validate` + `apply` |
| Upload/transcrição nunca rodou ao vivo | Teste ponta a ponta em staging (ver risco #4) |
| Checkout Stripe nunca exercitado | E2E com `E2E_STRIPE_ENABLED=1` em test mode |
| `.env.production` vazio | Preencher → `pnpm prod:check` |

## Verificação desta rodada

Typecheck limpo (API, worker, UI), 81 testes na API + 5 no UI verdes, build dos três frontends OK — reexecutados após as três correções.

## Recomendação honesta

O projeto está em um ponto em que **mais código sem deploy tem retorno decrescente**. Cada nova funcionalidade que eu escrever daqui pra frente entra na mesma categoria dos itens acima: implementada contra a documentação oficial, tipada, testada por unidade — e não verificada contra o serviço real. O passo de maior valor agora não é a próxima feature: é subir em staging com credenciais e deixar os fluxos externos falharem de verdade, onde é barato consertar.
