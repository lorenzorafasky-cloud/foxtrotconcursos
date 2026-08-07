# Produtividade e gamificacao no frontend do aluno

## Objetivo

Esta etapa entrega a experiencia inicial conectada para planejamento de estudos, calendario, metas, tarefas, Area Foco, temporizador, flashcards, favoritos, progresso e gamificacao no app do aluno.

## Escopo implementado

- Planejamento em `apps/aluno/src/app/planejamento/page.tsx`: listas, criacao de tarefas, conclusao/reabertura, metas, calendario, consistencia, aulas recentes, questoes favoritas e contadores de flashcards.
- Area Foco em `apps/aluno/src/app/foco/page.tsx`: temporizador Pomodoro/livre, vinculo com tarefa, registro real de sessao via API, preferencias de sons, sessoes recentes, consistencia e flashcards com filtros, favoritos e revisao.
- Gamificacao em `apps/aluno/src/app/gamificacao/page.tsx`: XP, nivel, ranking por periodo, SSE para atualizacao em tempo real, desafios, conquistas, notificacoes e regras de pontuacao.
- Helpers testaveis em `apps/aluno/src/lib/productivity.ts` e `apps/aluno/src/lib/gamification.ts` para calculos de resumo, datas, progresso, notificacoes e rotulos.

## APIs utilizadas

- `GET /planner/dashboard`
- `POST /planner/lists`
- `POST /planner/lists/:id/tasks`
- `PATCH /planner/tasks/:id/complete`
- `POST /planner/goals`
- `PATCH /planner/goals/:id`
- `GET /focus/dashboard`
- `POST /focus/sessions`
- `PATCH /focus/preferences`
- `GET /focus/flashcards`
- `POST /focus/flashcards`
- `POST /focus/flashcards/:id/review`
- `PATCH /focus/flashcards/:id/favorite`
- `GET /gamification/dashboard`
- `GET /gamification/leaderboard`
- `POST /gamification/challenges/:id/join`
- `PATCH /gamification/notifications/:id/read`
- `GET /gamification/stream`

## Criterios de aceite

- O aluno consegue criar listas, tarefas e metas com validacao minima no cliente.
- O aluno consegue concluir ou reabrir tarefas, e a tela reflete os dados recarregados da API.
- O calendario mostra tarefas datadas vindas do dashboard.
- O temporizador registra sessoes reais e permite associar uma tarefa.
- Flashcards podem ser criados, revelados, avaliados e favoritados.
- Ranking, desafios, conquistas e notificacoes sao carregados da API de gamificacao.
- Estados de carregamento, erro, vazio e sucesso ficam visiveis e acessiveis.
- As paginas usam `StudentNavigation` e componentes compartilhados de `@foxtrot/ui`.

## Testes

- `apps/aluno/src/lib/productivity.test.ts`: duracao, resumo de tarefas, metas, calendario, consistencia, timer e flashcards vencidos.
- `apps/aluno/src/lib/gamification.test.ts`: progresso, notificacoes, fontes de XP, conquistas e prazo de desafios.

## Riscos e proximos passos

- O streaming de gamificacao depende do ambiente permitir SSE com cookie de sessao.
- Os sons de foco sao sintetizados no navegador; arquivos de audio reais podem substituir essa camada depois.
- O upload/armazenamento de midia e analytics avancado continuam fora desta etapa.
