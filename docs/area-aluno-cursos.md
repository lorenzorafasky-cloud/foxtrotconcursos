# Area do aluno e catalogo de cursos

## Decisoes implementadas

- O catalogo publico usa `GET /courses` e exibe apenas cursos publicados.
- A area autenticada usa `GET /me/courses` para listar matriculas reais do aluno.
- A matricula usa `POST /courses/:slug/enroll` e so e criada quando o aluno tem entitlement ativo para o curso ou assinatura ilimitada.
- Progresso e avaliacao validam acesso ao curso no backend antes de gravar.
- Salvar progresso tambem garante a matricula e atualiza a ordenacao de "meus cursos".
- O detalhe do curso usa `GET /courses/:slug` e retorna `allowed`, `enrolled`, modulos, aulas e estatisticas calculadas.
- A aula usa `GET /lessons/:id`, `GET /lessons/:id/playback`, `PATCH /lessons/:id/progress`, `POST /lessons/:id/ratings` e `POST /lessons/:id/doubts`.

## Frontend

- `/`: catalogo, filtros, area de progresso e cursos matriculados.
- `/cursos/[slug]`: detalhe, matricula, modulos e aulas.
- `/aulas/[id]`: player quando disponivel, progresso, avaliacao, materiais e duvidas.

## Regras de acesso

- Visitantes conseguem ver o catalogo.
- Detalhe, matricula e aulas exigem sessao e permissao `student:access-courses`.
- Um aluno sem entitlement ve o curso bloqueado para matricula/aulas.

## Testes cobertos

- Matricula autorizada por entitlement.
- Bloqueio de matricula sem acesso.
- Salvamento de progresso com criacao/atualizacao de matricula.
- Builds dos frontends validam as rotas responsivas do aluno.
