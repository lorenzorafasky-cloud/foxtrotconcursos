# Frontend de questoes e simulados para alunos

Esta etapa implementa a experiencia do aluno em `/questoes`, conectada aos endpoints existentes da API.

## Funcionalidades

- Banco de questoes com filtros por texto, banca, carreira, materia, assunto, ano, instituicao, cargo, tipo, status, favoritas e questoes com explicacao.
- Resolucao de questoes objetivas e discursivas.
- Exibicao de explicacoes, respostas da comunidade/professor e estado da ultima tentativa.
- Favoritar e desfavoritar questoes, com aba dedicada de favoritos.
- Historico de respostas e revisao de erros.
- Relatorio de desempenho por materia e assunto.
- Criacao de simulados a partir dos filtros atuais.
- Execucao de simulados com respostas por questao e finalizacao.
- Resultado de simulado com acertos, aproveitamento, pendencias e explicacoes quando finalizado.

## Integracoes usadas

- `GET /questions/filters`
- `GET /questions`
- `GET /questions/:id`
- `POST /questions/:id/attempts`
- `POST /questions/:id/favorite`
- `DELETE /questions/:id/favorite`
- `GET /questions/favorites`
- `GET /questions/history`
- `GET /questions/review/errors`
- `GET /questions/performance`
- `GET /questions/simulations`
- `POST /questions/simulations`
- `GET /questions/simulations/:id`
- `POST /questions/simulations/:id/attempts`
- `POST /questions/simulations/:id/submit`

## Desempenho e responsividade

- A busca limita o volume retornado com `take` de 25, 50 ou 100 itens.
- A interface usa colunas responsivas e listas com cards compactos para telas menores.
- A navegacao usa a base compartilhada do aluno e evita renderizar solucao de questao antes de tentativa/explicacao disponivel.

## Validacao esperada

- `pnpm --filter @foxtrot/aluno test`
- `pnpm lint`
- `pnpm build`
- `pnpm e2e`
