#!/bin/bash

# EC2 Ollama Setup Script for Chess Master App
# Run this on a fresh Ubuntu 22.04 EC2 instance (t3.xlarge recommended)

set -e

echo "🚀 Starting Ollama setup for Chess Master App..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install prerequisites
echo "🔧 Installing prerequisites..."
sudo apt install -y curl git build-essential

# Install Ollama
echo "🦙 Installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh

# Configure Ollama service
echo "⚙️ Configuring Ollama service..."
sudo mkdir -p /etc/systemd/system/ollama.service.d/
sudo tee /etc/systemd/system/ollama.service.d/override.conf > /dev/null <<EOF
[Service]
Environment="OLLAMA_HOST=0.0.0.0"
Environment="OLLAMA_MODELS=/var/lib/ollama/models"
Environment="OLLAMA_NUM_PARALLEL=4"
Environment="OLLAMA_MAX_LOADED_MODELS=3"
Environment="OLLAMA_KEEP_ALIVE=5m"
Environment="OLLAMA_CPU_THREADS=4"
EOF

# Restart Ollama with new configuration
echo "♻️ Restarting Ollama service..."
sudo systemctl daemon-reload
sudo systemctl restart ollama
sudo systemctl enable ollama

# Wait for Ollama to start
echo "⏳ Waiting for Ollama to start..."
sleep 10

# Pull optimized models for chess
echo "📥 Downloading chess-optimized models..."
ollama pull llama3.2:1b-instruct-q4_0  # Fast, general purpose
ollama pull deepseek-coder:1.3b-instruct-q4_0  # For chess notation
ollama pull qwen2.5:0.5b  # Ultra-light for simple queries

# Create custom chess model
echo "🎯 Creating custom chess coach model..."
cat > /tmp/ChessCoachModelfile <<EOF
FROM llama3.2:1b-instruct-q4_0

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER repeat_penalty 1.1
PARAMETER num_predict 500

SYSTEM """
You are an expert chess coach and grandmaster with deep knowledge of:
- Chess openings and their theory
- Tactical patterns (forks, pins, skewers, discovered attacks)
- Positional play and pawn structures
- Endgame technique
- Chess history and famous games

When analyzing positions:
1. First identify the key features of the position
2. Consider both tactical and strategic elements
3. Provide concrete variations when possible
4. Explain concepts in clear, educational terms
5. Suggest practical moves and plans

Always use standard algebraic notation for moves.
"""
EOF

ollama create chess-coach:latest -f /tmp/ChessCoachModelfile

# Set up monitoring
echo "📊 Setting up monitoring..."
sudo tee /usr/local/bin/ollama-monitor.sh > /dev/null <<'EOF'
#!/bin/bash
# Simple monitoring script for Ollama

while true; do
    # Check if Ollama is running
    if systemctl is-active --quiet ollama; then
        # Get memory usage
        MEM_USAGE=$(ps aux | grep ollama | grep -v grep | awk '{print $4}' | head -1)
        
        # Get number of loaded models
        LOADED_MODELS=$(ollama list | tail -n +2 | wc -l)
        
        # Log metrics
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Status: Running, Memory: ${MEM_USAGE}%, Models: ${LOADED_MODELS}"
        
        # Check if memory usage is too high
        if (( $(echo "$MEM_USAGE > 80" | bc -l) )); then
            echo "⚠️ High memory usage detected. Consider unloading models."
        fi
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Status: Ollama service is down!"
    fi
    
    sleep 60
done
EOF

sudo chmod +x /usr/local/bin/ollama-monitor.sh

# Create systemd service for monitoring
sudo tee /etc/systemd/system/ollama-monitor.service > /dev/null <<EOF
[Unit]
Description=Ollama Monitoring Service
After=ollama.service

[Service]
Type=simple
ExecStart=/usr/local/bin/ollama-monitor.sh
Restart=always
StandardOutput=append:/var/log/ollama-monitor.log
StandardError=append:/var/log/ollama-monitor.log

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl start ollama-monitor
sudo systemctl enable ollama-monitor

# Set up log rotation
echo "📝 Configuring log rotation..."
sudo tee /etc/logrotate.d/ollama > /dev/null <<EOF
/var/log/ollama-monitor.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    create 0644 root root
}
EOF

# Install nginx for reverse proxy (optional)
echo "🌐 Installing Nginx..."
sudo apt install -y nginx

# Configure Nginx
sudo tee /etc/nginx/sites-available/ollama > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;
    
    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    
    # Proxy settings
    location / {
        proxy_pass http://localhost:11434;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for long-running AI requests
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://localhost:11434/api/tags;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/ollama /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# Test the installation
echo "🧪 Testing Ollama installation..."
if curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "✅ Ollama is running successfully!"
else
    echo "❌ Ollama test failed. Please check the logs."
    exit 1
fi

# Create a test script
echo "📝 Creating test script..."
tee ~/test-ollama.sh > /dev/null <<'EOF'
#!/bin/bash

echo "Testing chess analysis with Ollama..."

# Test chess analysis
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "chess-coach:latest",
    "prompt": "Analyze the position after 1.e4 e5 2.Nf3 Nc6 3.Bb5 (Ruy Lopez). What are the main ideas for both sides?",
    "stream": false
  }' | jq -r '.response'

echo -e "\n\nTesting position evaluation..."

# Test FEN analysis
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "chess-coach:latest",
    "prompt": "Analyze this position (FEN: rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 4). Find the best move and explain why.",
    "stream": false
  }' | jq -r '.response'
EOF

chmod +x ~/test-ollama.sh

# Display summary
echo "
========================================
✅ Ollama Setup Complete!
========================================

Instance Details:
- Ollama API: http://localhost:11434
- Nginx Proxy: http://localhost:80
- Models installed:
  * llama3.2:1b-instruct-q4_0
  * deepseek-coder:1.3b-instruct-q4_0
  * qwen2.5:0.5b
  * chess-coach:latest (custom)

Monitoring:
- Service status: sudo systemctl status ollama
- Monitor logs: sudo tail -f /var/log/ollama-monitor.log
- Test script: ~/test-ollama.sh

Next Steps:
1. Configure security group to allow traffic on port 80
2. Set up SSL certificate (recommended)
3. Configure your app to connect to this instance
4. Consider setting up auto-scaling

Memory Optimization Tips:
- Current config allows 3 models in memory
- Models auto-unload after 5 minutes idle
- Monitor memory usage in /var/log/ollama-monitor.log

Happy chess coaching! ♟️
"