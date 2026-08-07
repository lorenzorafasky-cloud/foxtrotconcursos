# IA e automacoes

## Escopo entregue

- Busca inteligente sobre cursos, aulas, questoes e anotacoes reais do aluno.
- Apoio ao estudo com resposta contextualizada por aula, questao e anotacoes.
- Geracao assistida de materiais quando autorizada, sempre enviada para revisao humana.
- Organizacao de transcricoes de aulas fornecidas pela plataforma ou enviadas por usuario autorizado.
- Jobs de automacao em background para processamento de transcricoes e materiais.
- Registro de uso, tokens estimados, custo estimado, provedor, modelo e metadados.
- Limite diario de custo por usuario antes de chamar o provedor.
- Tratamento de falhas do provedor sem gravar resposta parcial como conteudo publicado.

## Integracao real

A API usa Anthropic via HTTP quando `ANTHROPIC_API_KEY` esta configurada. A chave deve ficar apenas em segredo de ambiente.

Variaveis lidas do ambiente:

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `AI_DAILY_COST_LIMIT_CENTS`
- `AI_MAX_PROMPT_CHARS`
- `REDIS_URL`

Sem `ANTHROPIC_API_KEY`, chamadas generativas retornam erro controlado. Busca textual sem sintese por IA continua funcionando.

## Endpoints

- `GET /ai/search?q=texto&includeAi=true`
- `POST /ai/study-support`
- `POST /ai/materials`
- `POST /ai/lessons/transcript`
- `POST /ai/automations`
- `GET /ai/automations`
- `GET /ai/reviews`
- `PATCH /ai/reviews/:id`
- `GET /ai/usage`

## Permissoes

- `student:use-ai`: busca inteligente com sintese, apoio ao estudo e historico de uso do aluno.
- `ai:generate-materials`: geracao assistida, organizacao de transcricao e criacao de jobs de IA.
- `ai:review-materials`: fila de revisao humana e aprovacao ou rejeicao de conteudo gerado.

Administradores e professores recebem permissoes de geracao e revisao no seed. Alunos recebem permissao de uso assistido.

## Revisao humana

Conteudos gerados por IA nao sao publicados automaticamente.

Fluxos que geram material criam um `AiReviewItem` com status `PENDING`. Um usuario com `ai:review-materials` precisa aprovar ou rejeitar a sugestao. A aprovacao registra `reviewedBy` e `reviewedAt`.

## Limites e custos

Antes de chamar o provedor, a API soma o custo diario do usuario em `AiUsageEvent`. Se o total ultrapassar `AI_DAILY_COST_LIMIT_CENTS`, a chamada e bloqueada.

Cada chamada salva:

- usuario;
- recurso usado;
- provedor;
- modelo;
- tokens de entrada e saida, quando retornados pelo provedor;
- custo estimado em centavos;
- metadados tecnicos sem segredo.

O custo e estimado quando o provedor nao retorna valor monetario direto.

## Automacoes

A tabela `AiAutomationJob` registra jobs com status:

- `PENDING`
- `RUNNING`
- `COMPLETED`
- `FAILED`
- `NEEDS_REVIEW`

A API pode criar jobs e processa-los de forma assincrona. O worker em `apps/worker/src/index.ts` tambem registra a fila `ai` no BullMQ para processar jobs pendentes ou um job especifico.

Jobs com falha armazenam mensagem controlada em `error`, incrementam `attempts` e podem ser reprocessados sem apagar o historico.

## Transcricoes

O fluxo atual organiza transcricoes textuais ja fornecidas ou registradas como material `TRANSCRIPT`. Ele nao finge transcrever audio bruto quando nao ha provedor configurado para audio. O caminho de producao fica preparado para anexar uma etapa futura de transcricao real antes da organizacao por IA.

## Frontend

A area do aluno inclui a rota `/ia`.

Ela cobre:

- busca inteligente;
- sintese opcional por IA;
- apoio ao estudo;
- visualizacao de consumo e custo estimado.

## Testes esperados

- Busca inteligente sem IA nao chama provedor externo.
- Busca com sintese registra uso e custo.
- Limite diario bloqueia chamadas generativas.
- Falha do provedor retorna erro controlado e nao registra uso como sucesso.
- Geracao de material exige permissao.
- Material gerado cria item pendente de revisao humana.
- Transcricao curta ou invalida e rejeitada.
- Worker compila com fila `ai`.
