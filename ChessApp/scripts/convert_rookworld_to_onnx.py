#!/usr/bin/env python3
"""
Convert RookWorld-LM to ONNX for mobile deployment
This script downloads and converts the chess-specific RookWorld model to ONNX format
"""

import os
import torch
from transformers import GPT2Model, GPT2Tokenizer, GPT2Config
import onnx
from onnxruntime.transformers import optimizer
from onnxruntime.quantization import quantize_dynamic, QuantType
import numpy as np

def download_rookworld_model():
    """Download the RookWorld model from HuggingFace"""
    print("📥 Downloading RookWorld-LM-124M...")
    model_name = "jrahn/RookWorld-LM-124M"
    
    # Download model and tokenizer
    model = GPT2Model.from_pretrained(model_name)
    tokenizer = GPT2Tokenizer.from_pretrained(model_name)
    
    # Set to evaluation mode
    model.eval()
    
    return model, tokenizer

def convert_to_onnx(model, tokenizer, output_path="rookworld.onnx"):
    """Convert PyTorch model to ONNX format"""
    print("🔄 Converting to ONNX format...")
    
    # Create dummy input
    dummy_text = "P: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    inputs = tokenizer(dummy_text, return_tensors="pt", max_length=128, truncation=True, padding=True)
    
    # Export to ONNX
    with torch.no_grad():
        torch.onnx.export(
            model,
            (inputs['input_ids'],),
            output_path,
            export_params=True,
            opset_version=14,
            do_constant_folding=True,
            input_names=['input_ids'],
            output_names=['last_hidden_state'],
            dynamic_axes={
                'input_ids': {0: 'batch_size', 1: 'sequence_length'},
                'last_hidden_state': {0: 'batch_size', 1: 'sequence_length'}
            }
        )
    
    print(f"✅ Saved ONNX model to {output_path}")
    return output_path

def optimize_for_mobile(onnx_path, optimized_path="rookworld_mobile.onnx"):
    """Optimize ONNX model for mobile deployment"""
    print("📱 Optimizing for mobile...")
    
    # Load and optimize
    opt_model = optimizer.optimize_model(
        onnx_path,
        model_type='gpt2',
        num_heads=12,  # RookWorld uses GPT2 architecture
        hidden_size=768,
        optimization_options=optimizer.FusionOptions('gpt2')
    )
    
    # Save optimized model
    opt_model.save_model_to_file(optimized_path)
    print(f"✅ Saved optimized model to {optimized_path}")
    
    return optimized_path

def quantize_model(optimized_path, quantized_path="rookworld_quantized.onnx"):
    """Quantize model to INT8 for smaller size"""
    print("🗜️ Quantizing to INT8...")
    
    # Dynamic quantization
    quantize_dynamic(
        optimized_path,
        quantized_path,
        weight_type=QuantType.QInt8
    )
    
    # Check file sizes
    original_size = os.path.getsize(optimized_path) / (1024 * 1024)
    quantized_size = os.path.getsize(quantized_path) / (1024 * 1024)
    
    print(f"📊 Size reduction: {original_size:.1f}MB → {quantized_size:.1f}MB")
    print(f"✅ Saved quantized model to {quantized_path}")
    
    return quantized_path

def create_config_json():
    """Create configuration file for the app"""
    config = {
        "model_type": "chess-specific",
        "base_model": "RookWorld-LM",
        "architecture": "GPT2",
        "parameters": "124M",
        "vocabulary_size": 50257,
        "context_length": 1024,
        "features": [
            "move_generation",
            "game_simulation", 
            "chain_of_thought_reasoning",
            "stockfish_trained"
        ],
        "training_data": {
            "positions": "46M",
            "source": "Lichess 2022 ELO 2000+",
            "annotations": "Stockfish 16.1"
        },
        "performance": {
            "checkmate_in_one": "32.1%",
            "action_accuracy": "26.2%",
            "observation_accuracy": "99.9%"
        },
        "prompt_format": "P: [FEN] M: [MOVES] E: [EVALS] B: [BEST]"
    }
    
    import json
    with open("rookworld_config.json", "w") as f:
        json.dump(config, f, indent=2)
    
    print("✅ Created configuration file")

def main():
    """Main conversion pipeline"""
    print("🚀 Starting RookWorld ONNX Conversion Pipeline")
    print("=" * 50)
    
    try:
        # Step 1: Download model
        model, tokenizer = download_rookworld_model()
        
        # Step 2: Convert to ONNX
        onnx_path = convert_to_onnx(model, tokenizer)
        
        # Step 3: Optimize for mobile
        optimized_path = optimize_for_mobile(onnx_path)
        
        # Step 4: Quantize
        quantized_path = quantize_model(optimized_path)
        
        # Step 5: Create config
        create_config_json()
        
        print("\n🎉 Conversion Complete!")
        print(f"📦 Final model: {quantized_path}")
        print("\n📋 Next steps:")
        print("1. Upload {quantized_path} to your CDN")
        print("2. Update model URL in onnxModelService.ts")
        print("3. Test with the new prompt format")
        print("4. Ship to your users! 🚀")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Install required packages if needed
    try:
        import onnxruntime
    except ImportError:
        print("Installing required packages...")
        os.system("pip install transformers onnx onnxruntime onnxruntime-tools torch")
    
    main()