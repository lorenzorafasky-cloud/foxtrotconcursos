export type RawQuestionImport = {
  code: string;
  board: string;
  career: string;
  subject: string;
  topic?: string;
  institution: string;
  position: string;
};

export function normalizeQuestionImport(input: RawQuestionImport) {
  return {
    ...input,
    code: input.code.trim().toUpperCase(),
    board: cleanName(input.board),
    career: cleanName(input.career),
    subject: cleanName(input.subject),
    topic: input.topic ? cleanName(input.topic) : undefined,
    institution: cleanName(input.institution),
    position: cleanName(input.position)
  };
}

function cleanName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}
