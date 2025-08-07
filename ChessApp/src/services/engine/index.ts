export type AnalysisOptions = { depth?: number; timeMs?: number; multiPv?: number };

export interface AnalysisResult {
  bestMove: string;
  evaluation: number; // in pawns, positive for White
  pv?: string[];
  topMoves?: Array<{ move: string; evaluation: number; line: string[] }>;
}

class EngineFacade {
  private initialized = false;
  
  async initialize(): Promise<void> {
    if (this.initialized) return;
    const { offlineStockfish } = await import('../offlineStockfishService');
    await offlineStockfish.initialize();
    this.initialized = true;
  }

  async analyze(fen: string, options: AnalysisOptions | number = 15): Promise<AnalysisResult> {
    const { offlineStockfish } = await import('../offlineStockfishService');
    const opts = typeof options === 'number' ? { depth: options } : options;
    const analysis = await offlineStockfish.analyzePosition(fen, {
      depth: opts.depth,
      time: opts.timeMs,
      multiPv: opts.multiPv,
    });

    const evalPawns = analysis.evaluation.type === 'cp'
      ? analysis.evaluation.value / 100
      : analysis.evaluation.value > 0 ? 100 : -100;

    let topMoves: AnalysisResult['topMoves'];
    if (analysis.multiPv && analysis.multiPv.length > 0) {
      topMoves = analysis.multiPv.map(pv => ({
        move: pv.move,
        evaluation: pv.evaluation.type === 'cp' ? pv.evaluation.value / 100 : (pv.evaluation.value > 0 ? 100 : -100),
        line: pv.pv,
      }));
    }

    return {
      bestMove: analysis.bestMove,
      evaluation: evalPawns,
      pv: analysis.pv,
      topMoves,
    };
  }

  async getBestMove(fen: string, options?: { timeMs?: number; depth?: number }): Promise<string> {
    const { offlineStockfish } = await import('../offlineStockfishService');
    if (options?.depth) {
      const res = await this.analyze(fen, { depth: options.depth });
      return res.bestMove;
    }
    const time = options?.timeMs ?? 1000;
    return offlineStockfish.getBestMove(fen, time);
  }

  async getTopMoves(fen: string, count = 3, depth = 15): Promise<NonNullable<AnalysisResult['topMoves']>> {
    const { offlineStockfish } = await import('../offlineStockfishService');
    const items = await offlineStockfish.getTopMoves(fen, count, depth);
    return items;
  }

  async evaluate(fen: string): Promise<number> {
    const { offlineStockfish } = await import('../offlineStockfishService');
    return offlineStockfish.evaluatePosition(fen);
  }

  setStrength(level: number): void {
    // Fire and forget; initialization will be ensured on first call
    import('../offlineStockfishService').then(({ offlineStockfish }) => offlineStockfish.setStrength(level));
  }

  async stop(): Promise<void> {
    // No-op for offlineStockfish; reserved for future engines
  }

  async terminate(): Promise<void> {
    const { offlineStockfish } = await import('../offlineStockfishService');
    offlineStockfish.destroy();
    this.initialized = false;
  }
}

export const engine = new EngineFacade();