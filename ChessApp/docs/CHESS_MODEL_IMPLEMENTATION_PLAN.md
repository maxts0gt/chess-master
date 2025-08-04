# Chess-Specific Model Implementation Plan

## Selected Model: RookWorld-LM-124M

### Why RookWorld?
- **Latest Release**: January 2025 by LAION
- **Size**: 124M parameters (same as current)
- **Performance**: 32.1% Checkmate-in-One accuracy
- **Training**: 46M chess positions with Stockfish annotations
- **License**: Expected Apache 2.0 or MIT (verify before production)

### Implementation Steps:

#### 1. Verify License (Critical First Step)
```bash
# Check the model card on HuggingFace
https://huggingface.co/jrahn/RookWorld-LM-124M

# Look for LICENSE file or contact LAION
# Email: contact@laion.ai
```

#### 2. Download and Convert Model
```python
# Download from HuggingFace
from transformers import GPT2Model, GPT2Tokenizer

model_name = "jrahn/RookWorld-LM-124M"
model = GPT2Model.from_pretrained(model_name)
tokenizer = GPT2Tokenizer.from_pretrained(model_name)

# Convert to ONNX
import torch
dummy_input = tokenizer("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 
                       return_tensors="pt")

torch.onnx.export(
    model,
    (dummy_input.input_ids,),
    "rookworld_chess.onnx",
    export_params=True,
    opset_version=14,
    do_constant_folding=True,
    input_names=['input_ids'],
    output_names=['output'],
    dynamic_axes={'input_ids': {0: 'batch_size', 1: 'sequence'},
                  'output': {0: 'batch_size', 1: 'sequence'}}
)
```

#### 3. Update ONNXModelService
```typescript
export const CHESS_MODELS = {
  ROOKWORLD_MINI: {
    url: 'path/to/converted/rookworld_mini.onnx',
    size: 50 * 1024 * 1024, // ~50MB quantized
    description: 'RookWorld-LM: State-of-the-art chess-specific model',
    modelType: 'chess-specific',
    baseModel: 'RookWorld-LM-124M',
    license: 'Apache-2.0', // Verify this!
    features: [
      'chain_of_thought_reasoning',
      'trained_on_46M_positions', 
      'stockfish_annotations',
      'self_play_capable'
    ],
    performance: {
      checkmateInOne: 32.1,
      actionAccuracy: 26.2,
      parameters: '124M'
    }
  }
};
```

#### 4. Specialized Chess Prompting
```typescript
// RookWorld uses specific prompt format
private formatRookWorldPrompt(
  fen: string, 
  move: string,
  context: ChessContext
): string {
  // Format: P: [FEN] M: [top_moves] E: [evaluations] B: [best_move]
  return `P: ${fen} M: ${context.topMoves.join(' ')} E: ${context.evaluations.join(' ')} B:`;
}
```

### Alternative Options (If License Issues):

#### Option A: ChessGPT (Apache 2.0 Confirmed)
- Model: `Waterhorse/chessgpt-chat-v1`
- Size: 2.8B (needs quantization)
- License: Apache 2.0 ✅

#### Option B: Train Your Own
- Use RookWorld's training code (open source)
- Dataset: LAION chess dataset (open)
- Compute: ~$500 on cloud GPUs
- Time: 1-2 weeks

### Legal Checklist:
- [ ] Verify RookWorld license on HuggingFace
- [ ] Check for any attribution requirements
- [ ] Ensure no viral license terms
- [ ] Document license in your app
- [ ] Consider reaching out to LAION for clarification

### Marketing Benefits:
- "Powered by state-of-the-art chess AI"
- "Trained on 46 million chess positions"
- "Chess-specific intelligence, not generic AI"
- "Latest 2025 technology from LAION"

### Next Steps:
1. Check RookWorld license TODAY
2. If Apache/MIT, proceed with implementation
3. If unclear, contact LAION or use ChessGPT
4. Update app to highlight chess-specific AI