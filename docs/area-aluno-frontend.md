# Frontend da area do aluno

Esta etapa implementa a experiencia do aluno para catalogo, detalhes de curso, matricula, painel inicial, modulos, aulas, progresso e materiais.

## Telas

- `/`: painel inicial com resumo de progresso, curso em andamento, matriculas e cursos publicados.
- `/cursos`: catalogo completo com busca, filtro por fase, estados de carregamento, erro e vazio.
- `/cursos/[slug]`: detalhes protegidos, status de acesso, matricula, progresso agregado, modulos e aulas.
- `/aulas/[id]`: player autorizado, progresso, avaliacao, materiais, downloads permitidos e duvidas.

## Integracoes usadas

- `GET /courses`
- `GET /me/courses`
- `GET /courses/:slug`
- `POST /courses/:slug/enroll`
- `GET /lessons/:id`
- `GET /lessons/:id/playback`
- `PATCH /lessons/:id/progress`
- `POST /lessons/:id/ratings`
- `POST /lessons/:id/doubts`
- `GET /lessons/:id/materials/:assetId/download`

## Decisoes

- O fluxo final nao usa colecoes mockadas; catalogo, matriculas, progresso e aulas vêm da API.
- As telas reutilizam `@foxtrot/ui` e componentes locais de aluno: `StudentNavigation`, `CourseCard`, `CourseFilters` e `CourseModules`.
- Detalhes e aulas exigem sessao porque os endpoints sao protegidos por permissao.
- Materiais exibem disponibilidade real de download retornada pela API.
- Progresso de video e marcado por controle do aluno, pois o player em producao pode ser iframe/streaming externo.

## Validacao esperada

- `pnpm --filter @foxtrot/aluno test`
- `pnpm lint`
- `pnpm build`
- `pnpm e2e`
