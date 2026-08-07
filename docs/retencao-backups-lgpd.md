# Retencao, backups e LGPD

## Politica de retencao operacional

| Categoria | Retencao sugerida | Observacao |
| --- | ---: | --- |
| Conta, perfil e seguranca | Enquanto a conta existir | Remover ou anonimizar apos encerramento validado. |
| Progresso, anotacoes e produtividade | Enquanto a conta existir | Exportavel pelo titular. |
| Pagamentos, notas e webhooks | 5 anos ou prazo legal aplicavel | Manter para auditoria fiscal, disputa e comprovacao. |
| Auditoria de acoes sensiveis | 2 anos | Pode ser maior para investigacao ou obrigacao legal. |
| Logs tecnicos de aplicacao | 90 dias | Sem segredos, tokens ou senhas. |
| Eventos de erro e traces | 90 dias | Redacao de dados pessoais antes de envio. |
| Consentimentos | Enquanto aplicavel e 5 anos apos alteracao | Necessario para comprovar escolha do titular. |
| Dados de IA e custos | 180 dias | Manter minimo necessario para auditoria e contestacao. |
| Backups de banco | 30 dias | Testar restauracao antes do lancamento. |
| Arquivos removidos | Ate 30 dias em backup | Exclusao definitiva segue janela tecnica de backup. |

Os prazos devem ser revisados juridicamente antes do lancamento e ajustados a obrigacoes fiscais, consumeristas, contratuais e regulatorias.

## Backups

- Habilitar backups automaticos do Neon.
- Manter pelo menos um teste de restauracao documentado antes do go-live.
- Proteger backups com controle de acesso e trilha de auditoria.
- Separar credenciais de leitura, runtime e migration.
- Validar que restauracao preserva migrations aplicadas e integridade de pagamentos.

## Restauracao

1. Declarar incidente e congelar deploys.
2. Identificar ultimo backup integro.
3. Restaurar em ambiente isolado.
4. Rodar smoke tests: login, entitlement, pagamento, aula, questoes e LGPD.
5. Promover banco restaurado ou aplicar correcao incremental.
6. Registrar causa, impacto, janela e acoes preventivas.

## LGPD na plataforma

Recursos implementados:

- `/privacidade`: politica de privacidade.
- `/cookies`: politica de cookies.
- `/termos`: termos de uso.
- `/lgpd`: area do titular.
- `GET /privacy/me/export`: exportacao autenticada de dados pessoais.
- `POST /privacy/requests`: abertura de solicitacao LGPD.
- `GET /privacy/requests`: historico do usuario.
- `GET /privacy/admin/requests`: fila administrativa.
- `PATCH /privacy/admin/requests/:id`: resposta operacional.
- `POST /privacy/consents`: registro autenticado de consentimento.

## Processo humano

- Confirmar identidade do solicitante antes de alteracoes destrutivas.
- Avaliar conflito com obrigacoes legais, antifraude, pagamento e auditoria.
- Responder com linguagem clara.
- Registrar decisao e responsavel.
- Executar exclusao ou anonimizacao com roteiro tecnico revisado.
- Nunca apagar trilhas exigidas para seguranca, defesa legal ou obrigacao regulatoria sem avaliacao juridica.

## Cookies

- Cookies necessarios sustentam login e seguranca.
- Metricas e marketing exigem consentimento.
- O banner salva preferencias por versao no navegador.
- Quando o usuario estiver autenticado, o registro persistente pode ser feito por `POST /privacy/consents`.

## Incidentes

- Classificar severidade.
- Preservar evidencias.
- Revogar chaves afetadas.
- Comunicar operadores.
- Avaliar necessidade de notificacao a titulares e autoridade competente.
- Registrar postmortem com causa raiz e prevencao.
