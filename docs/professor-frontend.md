# Frontend completo do professor

## Objetivo

Entregar a primeira versao operacional completa do app do professor conectada a API existente, cobrindo conteudo, questoes, simulados, duvidas, alunos e discursivas.

## Telas e fluxos

- Painel inicial: resumo de cursos, aulas, duvidas, discursivas, alunos e fila de trabalho.
- Cursos: criacao, edicao basica e publicacao de cursos; listagem com modulos e aulas.
- Aulas: criacao/edicao de modulos e aulas, publicacao e acompanhamento de status.
- Materiais: vinculo de materiais por aula com tipo, URL/chave de armazenamento e permissao de download.
- Questoes: criacao de questoes objetivas e discursivas com filtros obrigatorios do catalogo.
- Simulados: montagem de simulados por filtros e acompanhamento de simulados recentes.
- Duvidas: resposta a perguntas abertas por aula.
- Alunos: acompanhamento de progresso por matricula, aulas concluidas e tempo assistido.
- Discursivas: correcao com nota e feedback.

## Controle de permissao

O frontend exibe permissao visual e bloqueia acoes quando a sessao nao possui:

- `teacher:publish-lessons` para cursos, modulos, aulas e materiais.
- `teacher:answer-questions` para questoes, simulados e duvidas.
- `teacher:grade-essays` para correcao de discursivas.

Contas `ADMIN_MASTER` recebem liberacao visual como override administrativo.

## APIs utilizadas

- `GET /professor/dashboard`
- `GET /professor/catalog`
- `POST /professor/courses`
- `PATCH /professor/courses/:id`
- `PATCH /professor/courses/:id/publish`
- `POST /professor/modules`
- `PATCH /professor/modules/:id`
- `POST /professor/lessons`
- `PATCH /professor/lessons/:id`
- `PATCH /professor/lessons/:id/publish`
- `POST /professor/materials`
- `POST /professor/questions`
- `POST /professor/simulations`
- `POST /lesson-doubts/:id/answer`
- `PATCH /professor/essays/:id/grade`

## Validacao e testes

Foram adicionados testes em `apps/professor/src/lib/professor.test.ts` para:

- permissoes do professor e override de administrador;
- resumo do dashboard;
- formatacao de tempo e slug;
- parsing de alternativas;
- validacao de curso e questao;
- acuracia de simulado.

## Limites conhecidos

- A API atual nao oferece exclusao de cursos, modulos, aulas ou materiais; por isso o frontend nao mostra acoes destrutivas.
- Materiais usam URL/chave de armazenamento ja existente; upload direto de arquivo depende da infraestrutura de midia.
- A pagina foi mantida em uma unica rota para preservar a estrutura atual do app do professor.
