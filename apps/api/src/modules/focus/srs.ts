export type SrsState = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
};

export function reviewFlashcardState(state: SrsState, quality: number): SrsState {
  const normalizedQuality = Math.max(0, Math.min(5, quality));
  if (normalizedQuality < 3) {
    return {
      easeFactor: Math.max(1.3, state.easeFactor - 0.2),
      intervalDays: 1,
      repetitions: 0
    };
  }

  const repetitions = state.repetitions + 1;
  const intervalDays = repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(state.intervalDays * state.easeFactor);
  const easeFactor = Math.max(
    1.3,
    state.easeFactor + (0.1 - (5 - normalizedQuality) * (0.08 + (5 - normalizedQuality) * 0.02))
  );

  return { easeFactor, intervalDays, repetitions };
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
