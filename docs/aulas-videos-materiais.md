# Aulas, videos e materiais

## Escopo implementado

- Player autorizado por `GET /lessons/:id/playback`.
- Progresso por `PATCH /lessons/:id/progress`.
- Materiais complementares sanitizados em `GET /lessons/:id`.
- Download autorizado por `GET /lessons/:id/materials/:assetId/download`.
- Duvidas de aluno por `POST /lessons/:id/doubts`.
- Respostas de professor/admin por `POST /lesson-doubts/:id/answer`.

## Autorizacao

- Acesso de aluno exige `student:access-courses` e entitlement ativo do curso.
- Progresso, avaliacao, playback, duvida e download reutilizam a mesma verificacao de acesso da aula.
- Resposta de professor exige `teacher:answer-questions`.
- Professor so responde duvidas de materias vinculadas em `ProfessorSubject`; `ADMIN_MASTER` pode responder qualquer duvida.

## Midia e storage

- Video usa Cloudflare Stream com JWT assinado quando `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_SIGNING_KEY_ID` e `CLOUDFLARE_STREAM_SIGNING_PRIVATE_KEY` existem.
- Materiais aceitam URLs publicas e objetos `r2://bucket/key`.
- Para R2, o download usa `CLOUDFLARE_R2_PUBLIC_URL` como base publica/CDN. Sem essa variavel, a API retorna indisponibilidade em vez de expor caminho interno.
- A resposta da aula nao expõe `asset.url`; retorna `storage.provider`, `canDownload` e metadata segura.

## Rastreabilidade

As seguintes acoes passam pelo interceptor de auditoria:

- `lesson.playback`
- `lesson.material.download`
- `lesson.progress.update`
- `lesson.rating.upsert`
- `lesson.doubt.create`
- `lesson-doubt.answer`

## Frontends

- O app aluno usa o endpoint de download autorizado e abre a URL retornada.
- O painel do professor consome `/professor/dashboard` e permite responder duvidas reais.

## Testes

- Download autorizado de material.
- Bloqueio de download sem acesso.
- Bloqueio de resposta de professor fora do escopo.
- Resposta de admin.
- Regras do adaptador de midia para Stream, URL publica e R2.
