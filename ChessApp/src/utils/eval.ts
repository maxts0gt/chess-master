export function normalizeEngineScore(score: { type: 'cp' | 'mate'; value: number }): number {
  if (score.type === 'cp') return score.value / 100;
  return score.value > 0 ? 100 : -100;
}

export function isMistake(prevEval: number, nextEval: number, thresholdPawns = 0.7): boolean {
  // From side-to-move perspective: a drop greater than threshold is a mistake
  return prevEval - nextEval > thresholdPawns;
}