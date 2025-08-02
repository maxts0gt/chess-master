# Ollama Setup Guide for Chess Master App

## Overview

This guide will help you install Ollama locally and integrate it with the Chess Master app for enhanced AI-powered chess coaching using multiple AI agents.

## What is Ollama?

Ollama is a tool that allows you to run large language models (LLMs) locally on your machine. This means:
- **Privacy**: Your chess analysis stays on your device
- **Speed**: No internet latency for AI responses
- **Cost**: No API fees for AI usage
- **Customization**: Use specialized chess models

## Installation

### Windows

1. **Download Ollama**
   ```bash
   # Go to https://ollama.com/download/windows
   # Download the installer
   # Run OllamaSetup.exe
   ```

2. **Verify Installation**
   ```bash
   ollama --version
   ```

### macOS

1. **Download Ollama**
   ```bash
   # Option 1: Download from website
   # Go to https://ollama.com/download/mac
   
   # Option 2: Use Homebrew
   brew install ollama
   ```

2. **Start Ollama**
   ```bash
   ollama serve
   ```

### Linux

1. **Install via script**
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Start Ollama service**
   ```bash
   sudo systemctl start ollama
   ```

## Downloading Chess-Optimized Models

### 1. General Purpose Model (Required)
```bash
# Download Llama 3.2 (3B parameters, good for general chess discussion)
ollama pull llama3.2:latest

# Alternative: Smaller model for limited resources
ollama pull llama3.2:1b
```

### 2. Code/Analysis Model (Recommended)
```bash
# For chess notation and move analysis
ollama pull deepseek-coder:latest
```

### 3. Chess-Specific Models (If Available)
```bash
# Check if ChessGPT is available
ollama pull chessgpt:latest

# Alternative: Fine-tune your own model
# See "Advanced Setup" section below
```

## Testing Ollama

### 1. Basic Test
```bash
# Test if Ollama is running
curl http://localhost:11434/api/tags

# Should return JSON with installed models
```

### 2. Chess Analysis Test
```bash
# Test chess position analysis
ollama run llama3.2:latest "Analyze the chess position after 1.e4 e5 2.Nf3 Nc6 3.Bb5. What are White's main ideas?"
```

### 3. Test with the App

1. **Start Ollama** (if not already running)
   ```bash
   ollama serve
   ```

2. **Open the Chess Master App**
   - Navigate to "AI Training" from the home screen
   - You should see "Ollama: Connected" in green

3. **Test Multi-Agent Analysis**
   - Make a few moves on the board
   - Tap "Analyze Position"
   - You should see analysis from both the Multi-Agent system and Ollama

## How AI Agents Help Your Chess

### 1. **Opening Expert Agent**
- Identifies your opening by name
- Explains key ideas and plans
- Suggests book moves
- Warns about common traps

### 2. **Tactical Analyst Agent**
- Finds combinations and forcing moves
- Identifies threats and weaknesses
- Calculates variations
- Spots patterns (forks, pins, skewers)

### 3. **Positional Master Agent**
- Evaluates pawn structures
- Identifies weak squares
- Suggests long-term plans
- Explains strategic concepts

### 4. **Endgame Specialist Agent**
- Recognizes theoretical positions
- Teaches winning techniques
- Identifies drawing resources
- Calculates precise variations

### 5. **Psychological Coach Agent**
- Analyzes practical chances
- Suggests moves that create problems
- Identifies opponent's weaknesses
- Manages time and resources

## Viewing AI Logs

### Enable Detailed Logging

1. **In the app**, check the console for agent communication:
   ```
   [MAS] orchestrator → position_evaluator: request
   [MAS] position_evaluator → orchestrator: response
   [MAS] orchestrator → tactical_analyst: request
   ```

2. **Ollama logs**:
   ```bash
   # View Ollama logs
   journalctl -u ollama -f  # Linux
   tail -f ~/.ollama/logs/server.log  # macOS
   ```

3. **Performance metrics**:
   - Each analysis shows duration
   - Token count and generation speed
   - Model used for each response

## Advanced Setup

### Create a Chess-Specific Model

1. **Create a Modelfile**
   ```dockerfile
   # Modelfile
   FROM llama3.2:latest
   
   PARAMETER temperature 0.7
   PARAMETER top_p 0.9
   
   SYSTEM """
   You are a chess grandmaster and coach. You excel at:
   - Analyzing chess positions using algebraic notation
   - Explaining strategic and tactical concepts
   - Identifying patterns and combinations
   - Teaching chess principles
   Always provide concrete variations and evaluations.
   """
   ```

2. **Create the model**
   ```bash
   ollama create chess-coach -f Modelfile
   ```

3. **Update the app configuration**
   - In `ollamaService.ts`, update the model configuration:
   ```typescript
   models: {
     general: 'llama3.2:latest',
     chess: 'chess-coach:latest',  // Your custom model
     analysis: 'deepseek-coder:latest',
   }
   ```

## Troubleshooting

### Ollama Not Connecting

1. **Check if Ollama is running**
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **Check firewall settings**
   - Ensure port 11434 is not blocked

3. **Restart Ollama**
   ```bash
   # macOS/Linux
   ollama stop
   ollama serve
   
   # Windows
   # Restart from system tray
   ```

### Slow Performance

1. **Use smaller models**
   ```bash
   ollama pull llama3.2:1b  # 1B parameter model
   ```

2. **Adjust context window**
   - Reduce analysis depth in app settings

3. **Enable GPU acceleration**
   ```bash
   # Check GPU usage
   ollama ps
   ```

### Model Download Issues

1. **Check disk space**
   - Models can be 2-10GB each

2. **Use different download source**
   ```bash
   # Set custom registry
   export OLLAMA_HOST=https://your-mirror.com
   ```

## Best Practices

1. **Model Selection**
   - Use smaller models for quick analysis
   - Use larger models for complex positions
   - Specialize models for different aspects

2. **Prompt Engineering**
   - Be specific about position (use FEN)
   - Ask for concrete variations
   - Request evaluation scores

3. **Resource Management**
   - Close unused models: `ollama stop model-name`
   - Monitor memory usage
   - Use streaming for long analyses

## Integration Benefits

### Multi-Agent Collaboration
- **In-app agents** provide structured analysis
- **Ollama agents** add natural language explanations
- **Combined insights** give comprehensive understanding

### Example Workflow
1. Make moves in the app
2. Multi-agent system identifies tactics
3. Ollama explains WHY those tactics work
4. Ask follow-up questions for deeper understanding

## Conclusion

With Ollama integrated into the Chess Master app, you get:
- **Instant AI analysis** without internet
- **Multiple expert perspectives** on your games
- **Natural language explanations** of complex concepts
- **Personalized coaching** that adapts to your style

Start with the basic setup and gradually explore advanced features as you become comfortable with the system. Happy chess learning! ♟️🤖