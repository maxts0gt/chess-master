#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

API_URL="http://localhost:8080/api/v1"
TOKEN=""

echo "🧪 Testing Chess App Backend API"
echo "================================"

# Test health endpoint
echo -e "\n${GREEN}Testing Health Endpoint${NC}"
curl -s http://localhost:8080/health | python3 -m json.tool

# Test user registration
echo -e "\n${GREEN}Testing User Registration${NC}"
REGISTER_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "email": "player1@chess.com",
    "password": "password123"
  }')
echo $REGISTER_RESPONSE | python3 -m json.tool
TOKEN=$(echo $REGISTER_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

# Test user login
echo -e "\n${GREEN}Testing User Login${NC}"
curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player1@chess.com",
    "password": "password123"
  }' | python3 -m json.tool

# Test analyze position
echo -e "\n${GREEN}Testing Position Analysis${NC}"
curl -s -X POST $API_URL/chess/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  }' | python3 -m json.tool

# Test validate move
echo -e "\n${GREEN}Testing Move Validation${NC}"
curl -s -X POST $API_URL/chess/validate-move \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "from": "e2",
    "to": "e4"
  }' | python3 -m json.tool

# Test deathmatch request
echo -e "\n${GREEN}Testing Deathmatch Mode${NC}"
curl -s -X POST $API_URL/training/deathmatch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "skill_level": "intermediate"
  }' | python3 -m json.tool

# Test AI personalities
echo -e "\n${GREEN}Testing AI Personalities${NC}"
curl -s -X GET $API_URL/ai/personalities \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo -e "\n✅ Backend API Testing Complete!"