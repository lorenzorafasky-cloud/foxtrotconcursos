# Refinamento final dos frontends

## Ajustes aplicados

- Padronizacao de metadados nos apps aluno, professor e administrador.
- Painel do aluno com SEO publico mais descritivo.
- Paineis professor e administrador marcados como `noindex` por serem areas restritas.
- Onboarding do aluno sem valores pre-preenchidos como dados finais; agora exige validacao minima antes de enviar para a API.
- Onboarding, IA e assinaturas passaram a usar `StudentNavigation`, reduzindo telas soltas dentro da experiencia do aluno.
- Cancelamento de assinatura passou a exigir confirmacao visual antes da chamada sensivel.
- Mantida integracao real com APIs existentes; nao foram adicionados mocks ou dados ficticios aos fluxos finais.

## Validacoes esperadas

- `pnpm --filter @foxtrot/aluno lint`
- `pnpm --filter @foxtrot/admin lint`
- `pnpm --filter @foxtrot/professor lint`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`

## Pendencias restantes

- Upload real de arquivos/midia depende da infraestrutura final de armazenamento.
- Edicoes profundas de algumas entidades dependem de endpoints adicionais de detalhe/exclusao.
- Testes E2E autenticados ainda dependem de massa de dados e credenciais de teste dedicadas.
- Auditoria visual de dados reais em producao deve ser repetida apos deploy e configuracao definitiva de dominio.
