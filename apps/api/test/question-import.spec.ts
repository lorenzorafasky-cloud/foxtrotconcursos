import { describe, expect, it } from "vitest";
import { normalizeQuestionImport } from "../src/modules/admin/question-import";

describe("normalizeQuestionImport", () => {
  it("normalizes code and catalog names", () => {
    expect(
      normalizeQuestionImport({
        code: " fox-dcon-1 ",
        board: " CESPE   /   CEBRASPE ",
        career: " Policial ",
        subject: " Direito   Constitucional ",
        topic: " Direitos   fundamentais ",
        institution: " Policia Federal ",
        position: " Agente "
      })
    ).toMatchObject({
      code: "FOX-DCON-1",
      board: "CESPE / CEBRASPE",
      subject: "Direito Constitucional",
      topic: "Direitos fundamentais"
    });
  });
});
