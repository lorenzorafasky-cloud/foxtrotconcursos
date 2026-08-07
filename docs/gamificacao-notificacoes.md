# Gamificacao e notificacoes

## Escopo entregue

- XP auditavel por fonte autorizada.
- Conquistas com progresso, desbloqueio, recompensa e notificacao.
- Niveis calculados por XP acumulado.
- Ranking global por periodo diario, semanal ou geral.
- Desafios ativos com entrada do aluno, progresso e recompensa.
- Notificacoes internas com leitura e stream em tempo real.
- Worker para snapshots de ranking e processamento assincrono de notificacoes.

## Regras de XP

As regras ficam centralizadas em `apps/api/src/modules/gamification/gamification.rules.ts`.

| Fonte | Regra | Pontos | Limite diario |
| --- | --- | ---: | ---: |
| `question:correct` | questao objetiva correta | 10 | 300 |
| `focus:net-minutes` | minuto liquido de foco | 1 por minuto | 480 |
| `planner:task-complete` | tarefa concluida | 5 | 100 |
| `flashcard:review` | revisao de flashcard | ate 3 | 150 |
| `achievement:reward` | bonus de conquista | definido na conquista | 500 |
| `challenge:reward` | bonus de desafio | definido no desafio | 500 |

## Protecoes contra abuso

- A API nao expoe endpoint publico para conceder XP arbitrario.
- Cada fonte precisa existir na tabela de regras em codigo.
- Eventos podem usar `idempotencyKey` unica para evitar pontuacao duplicada.
- Pontos sao normalizados e limitados por teto diario por fonte.
- Eventos suspeitos podem ser invalidados por `revokedAt` sem apagar historico.
- Acoes sensiveis como entrada em desafio e leitura de notificacao passam pelo interceptor de auditoria.

## Tempo real

O endpoint `GET /gamification/stream` usa Server-Sent Events.

Eventos emitidos:

- `dashboard`: estado inicial de XP, nivel, conquistas, desafios, notificacoes e ranking.
- `leaderboard`: atualizacao periodica do ranking semanal.
- `notification`: nova notificacao interna.
- `xp`: novo evento de XP gerado durante a sessao.

## Worker

O worker em `apps/worker/src/index.ts` processa:

- fila `ranking`, job `snapshot`: cria `LeaderboardSnapshot` por periodo.
- fila `notifications`, job `create`: cria notificacao interna fora do request HTTP.
- fila `notifications`, job `challenge-expired`: finaliza desafios ativos vencidos.

## Frontend

A tela do aluno fica em `/gamificacao`.

Ela consome:

- `GET /gamification/dashboard`
- `GET /gamification/leaderboard`
- `POST /gamification/challenges/:id/join`
- `PATCH /gamification/notifications/:id/read`
- `GET /gamification/stream`

## Testes esperados

- Pontuacao autorizada e com limite diario.
- Idempotencia de XP.
- Desbloqueio de conquista com notificacao.
- Entrada em desafio e recompensa ao completar meta.
- Ranking ordenado por XP.
- Frontend compilando com a rota `/gamificacao`.
