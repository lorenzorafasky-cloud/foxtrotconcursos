# Fundacao compartilhada dos frontends

Esta etapa prepara uma base unica para os apps `aluno`, `professor` e `admin`, sem implementar novas paginas de negocio.

## Estrutura

- `packages/ui/src/design-tokens.ts`: tokens fonte para cores, radius, sombras e tipografia.
- `packages/ui/src/tailwind-preset.ts`: preset Tailwind reutilizado pelos tres apps.
- `packages/ui/src/tokens.css`: variaveis CSS, base global, foco acessivel, scrollbar e reducao de movimento.
- `packages/ui/src/index.tsx`: componentes reutilizaveis, estados padrao, navegacao base e autenticacao cliente.

## Componentes disponiveis

- Identidade e layout: `BrandMark`, `AppFrame`, `SkipLink`, `AppNav`, `PageHeader`.
- Controles: `Button`, `IconButton`, `Input`, `Select`, `Textarea`, `Field`, `Tabs`.
- Conteudo operacional: `Card`, `StatCard`, `Badge`, `DataTable`.
- Estados: `LoadingState`, `Skeleton`, `EmptyState`, `ErrorState`.

## Autenticacao cliente

`AuthSessionProvider` centraliza a leitura de `/auth/me`, estado da sessao e operacoes basicas de refresh/logout. Os layouts dos tres apps ja envolvem suas paginas com o provider:

- aluno: `ALUNO`, `ALUNO_ILIMITADO`, `ADMIN_MASTER`
- professor: `PROFESSOR`, `ADMIN_MASTER`
- admin: `ADMIN_MASTER`

As telas existentes continuam livres para usar seus fluxos atuais; novas telas podem consumir `useAuthSession()` para evitar duplicacao.

## Criterios para proximas telas

- Usar tokens e classes do preset compartilhado, evitando cores soltas quando houver equivalente.
- Usar estados padrao para carregamento, vazio e erro.
- Usar `Field` com labels visiveis e mensagens compreensiveis em formularios.
- Usar `DataTable` ou o mesmo padrao visual em tabelas com busca, filtros e paginacao.
- Manter foco visivel, labels acessiveis, `aria-current` em navegacao e `role="alert"` em erros.
