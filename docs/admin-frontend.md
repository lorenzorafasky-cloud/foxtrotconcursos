# Frontend administrativo completo

## Objetivo

Entregar a primeira versao completa do painel administrativo conectada a API real da plataforma, cobrindo operacao, usuarios, permissoes, cursos, professores, matriculas, questoes, simulados, pagamentos, cupons, configuracoes, feature flags, auditoria e moderacao.

## Escopo implementado

- Painel operacional com indicadores e auditoria recente.
- Gestao de usuarios com busca, filtro por perfil, paginacao, criacao, edicao de dados basicos, papeis, 2FA, verificacao de e-mail e permissao direta.
- Gestao de permissoes por perfil com confirmacao para alteracoes sensiveis.
- Gestao de cursos com busca, filtro por status, criacao, edicao basica e publicacao.
- Gestao de professores com vinculo e remocao de materias.
- Gestao de matriculas com concessao e revogacao confirmada.
- Banco de questoes com busca, filtros por tipo/materia, importacao JSON e edicao basica.
- Simulados com busca, filtro por status, paginacao e resumo de desempenho.
- Pagamentos com busca, filtro por status, alteracao confirmada de status e exibicao financeira.
- Cupons com busca, filtro ativo/inativo, criacao, edicao e ativacao/desativacao.
- Configuracoes globais com JSON validado no cliente antes do envio.
- Feature flags com alternancia confirmada.
- Moderacao com filas de respostas/duvidas, motivo e acoes `APPROVE`, `REJECT` e `ESCALATE`.
- Auditoria com busca/filtro por acao.

## APIs utilizadas

- `GET /admin/dashboard`
- `GET /admin/catalog`
- `GET /admin/users`
- `POST /admin/users`
- `PATCH /admin/users/:id`
- `PATCH /admin/users/:id/roles`
- `PATCH /admin/users/:id/permissions/:key`
- `PATCH /admin/roles/:name/permissions`
- `GET /admin/courses`
- `POST /admin/courses`
- `PATCH /admin/courses/:id`
- `PATCH /admin/courses/:id/publish`
- `GET /admin/professors`
- `POST /admin/professors/:userId/subjects`
- `DELETE /admin/professors/:userId/subjects/:subjectId`
- `GET /admin/enrollments`
- `POST /admin/enrollments`
- `DELETE /admin/enrollments/:userId/:courseId`
- `GET /admin/questions`
- `PATCH /admin/questions/:id`
- `POST /admin/questions/import`
- `GET /admin/simulations`
- `GET /admin/payments`
- `PATCH /admin/payments/:id/status`
- `GET /admin/coupons`
- `POST /admin/coupons`
- `PATCH /admin/coupons/:id`
- `GET /admin/settings`
- `PATCH /admin/settings/:key`
- `GET /admin/feature-flags`
- `PATCH /admin/feature-flags/:key`
- `GET /admin/moderation`
- `POST /admin/moderation`
- `GET /admin/audit`

## Qualidade

Foram adicionados testes em `apps/admin/src/lib/admin.test.ts` para filtros, formatacao, validacoes, permissao textual, pagamentos e simulados.

## Limites conhecidos

- O backend atual nao expoe exclusao de usuarios/cursos/questoes/cupons; o frontend evita acoes destrutivas sem endpoint.
- A edicao de curso na listagem exige que o administrador preencha a descricao, pois o endpoint de lista nao retorna esse campo.
- A revogacao de materia do professor depende do administrador selecionar a materia manualmente.
