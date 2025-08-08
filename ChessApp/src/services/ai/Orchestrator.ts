import { engine } from '../engine';
import { coachFacade } from '../coach';

export interface MoveContext {
  fenBefore: string;
  fenAfter: string;
  moveSan: string;
  playerRating: number;
}

export class CoachingOrchestrator {
  async *explainWithGuardrails(ctx: MoveContext): AsyncGenerator<string> {
    // Get engine evals to anchor explanation
    const beforeEval = await engine.evaluate(ctx.fenBefore);
    const afterEval = await engine.evaluate(ctx.fenAfter);
    const delta = afterEval - beforeEval;

    // Prime a short preamble based on eval
    const direction = delta >= 0 ? 'improved' : 'worsened';
    yield `This move ${direction} your position by ${Math.abs(delta).toFixed(1)} pawns. `;

    // Stream LLM explanation
    for await (const token of coachFacade.explainMoveStream(ctx.fenAfter, ctx.moveSan, ctx.playerRating)) {
      yield token;
    }
  }
}

export const coachingOrchestrator = new CoachingOrchestrator();