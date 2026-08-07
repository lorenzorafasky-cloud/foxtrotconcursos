# Importacao do banco de questoes

Formato JSON aceito pelo pipeline de importacao em lote:

```json
{
  "code": "FOX-DCON-0001",
  "kind": "MULTIPLE_CHOICE",
  "statement": "Texto da questao",
  "alternatives": [{ "id": "A", "text": "Alternativa" }],
  "correctAnswer": "A",
  "year": 2026,
  "board": "CESPE / CEBRASPE",
  "career": "Policial",
  "subject": "Direito Constitucional",
  "topic": "Direitos fundamentais",
  "institution": "Policia Federal",
  "position": "Agente de Policia Federal",
  "sourceExam": "PF 2026",
  "explanation": "Comentario oficial"
}
```

Antes de inserir questoes, o importador normaliza banca, carreira, materia, assunto, instituicao e cargo. Esses campos sao entidades separadas no Prisma para filtros combinaveis e indices eficientes.
