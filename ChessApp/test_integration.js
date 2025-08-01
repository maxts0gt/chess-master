#!/usr/bin/env node

/**
 * Integration Test Script for Chess App
 * Tests the main API endpoints to ensure frontend-backend integration works
 */

const http = require('http');

const BASE_URL = 'http://localhost:8081/api/v1';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const responseData = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            data: responseData,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function testHealthEndpoint() {
  console.log('🔍 Testing Health Endpoint...');
  try {
    const response = await makeRequest('GET', '/health');
    if (response.status === 200) {
      console.log('✅ Health endpoint working');
      console.log(`   Status: ${response.data.status}`);
      console.log(`   Version: ${response.data.version}`);
      return true;
    } else {
      console.log(`❌ Health endpoint failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Health endpoint error: ${error.message}`);
    return false;
  }
}

async function testChessAnalysis() {
  console.log('🔍 Testing Chess Analysis Endpoint...');
  try {
    const testFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const response = await makeRequest('POST', '/chess/analyze', {
      fen: testFen,
      depth: 8
    });
    
    if (response.status === 200) {
      console.log('✅ Chess analysis working');
      console.log(`   Evaluation: ${response.data.evaluation}`);
      console.log(`   Best move: ${response.data.best_move}`);
      console.log(`   Tactical patterns: ${response.data.tactical_patterns.join(', ')}`);
      return true;
    } else {
      console.log(`❌ Chess analysis failed: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Chess analysis error: ${error.message}`);
    return false;
  }
}

async function testFenValidation() {
  console.log('🔍 Testing FEN Validation Endpoint...');
  try {
    const validFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const response = await makeRequest('POST', '/chess/validate-fen', {
      fen: validFen
    });
    
    if (response.status === 200 && response.data.valid) {
      console.log('✅ FEN validation working');
      console.log(`   Message: ${response.data.message}`);
      return true;
    } else {
      console.log(`❌ FEN validation failed: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ FEN validation error: ${error.message}`);
    return false;
  }
}

async function testAICoaching() {
  console.log('🔍 Testing AI Coaching Endpoint...');
  try {
    const testFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const response = await makeRequest('POST', '/ai/coaching/analyze', {
      fen: testFen,
      agent: 'tactical'
    });
    
    if (response.status === 200) {
      console.log('✅ AI coaching working');
      console.log(`   Agent: ${response.data.agent_used}`);
      console.log(`   Confidence: ${response.data.confidence}`);
      console.log(`   Analysis: ${response.data.analysis.substring(0, 100)}...`);
      console.log(`   Suggestions: ${response.data.suggestions.length} provided`);
      return true;
    } else {
      console.log(`❌ AI coaching failed: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ AI coaching error: ${error.message}`);
    return false;
  }
}

async function testCoachingPersonalities() {
  console.log('🔍 Testing Coaching Personalities Endpoint...');
  try {
    const response = await makeRequest('GET', '/ai/coaching/personalities');
    
    if (response.status === 200 && Array.isArray(response.data)) {
      console.log('✅ Coaching personalities working');
      console.log(`   Found ${response.data.length} personalities`);
      response.data.forEach(p => {
        console.log(`   - ${p.name}: ${p.description}`);
      });
      return true;
    } else {
      console.log(`❌ Coaching personalities failed: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Coaching personalities error: ${error.message}`);
    return false;
  }
}

async function testMoveSuggestions() {
  console.log('🔍 Testing Move Suggestions Endpoint...');
  try {
    const testFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const response = await makeRequest('POST', '/ai/coaching/suggest', {
      fen: testFen,
      agent: 'positional',
      move_count: 3
    });
    
    if (response.status === 200) {
      console.log('✅ Move suggestions working');
      console.log(`   Agent: ${response.data.agent_personality}`);
      console.log(`   Found ${response.data.moves.length} moves`);
      response.data.moves.forEach((move, index) => {
        console.log(`   ${index + 1}. ${move.move_notation} (${move.evaluation}): ${move.reasoning.substring(0, 50)}...`);
      });
      return true;
    } else {
      console.log(`❌ Move suggestions failed: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Move suggestions error: ${error.message}`);
    return false;
  }
}

async function testTrainingPlan() {
  console.log('🔍 Testing Training Plan Endpoint...');
  try {
    const response = await makeRequest('GET', '/ai/coaching/plan');
    
    if (response.status === 200) {
      console.log('✅ Training plan working');
      console.log(`   Daily puzzles: ${response.data.daily_puzzles}`);
      console.log(`   Difficulty: ${response.data.difficulty_level}`);
      console.log(`   Focus areas: ${response.data.focus_areas.join(', ')}`);
      console.log(`   Agent recommendations: ${response.data.agent_recommendations.length}`);
      return true;
    } else {
      console.log(`❌ Training plan failed: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Training plan error: ${error.message}`);
    return false;
  }
}

async function testGameCreation() {
  console.log('🔍 Testing Game Creation Endpoint...');
  try {
    const response = await makeRequest('POST', '/chess/games', {
      white_player_id: null,
      black_player_id: null
    });
    
    if (response.status === 200) {
      console.log('✅ Game creation working');
      console.log(`   Game ID: ${response.data.game_id}`);
      console.log(`   Starting FEN: ${response.data.fen}`);
      return true;
    } else {
      console.log(`❌ Game creation failed: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Game creation error: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runIntegrationTests() {
  console.log('🏆 Chess App Integration Tests');
  console.log('===============================\n');

  const tests = [
    { name: 'Health Check', fn: testHealthEndpoint },
    { name: 'Chess Analysis', fn: testChessAnalysis },
    { name: 'FEN Validation', fn: testFenValidation },
    { name: 'AI Coaching', fn: testAICoaching },
    { name: 'Coaching Personalities', fn: testCoachingPersonalities },
    { name: 'Move Suggestions', fn: testMoveSuggestions },
    { name: 'Training Plan', fn: testTrainingPlan },
    { name: 'Game Creation', fn: testGameCreation },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n📋 Running: ${test.name}`);
    console.log('─'.repeat(50));
    
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} error: ${error.message}`);
      failed++;
    }
    
    // Add a small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📊 Test Results');
  console.log('===============');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Integration is working perfectly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check server status and configuration.');
  }

  console.log('\n💡 Notes:');
  console.log('- Make sure the backend server is running on port 8081');
  console.log('- AI features may require Ollama to be running for full functionality');
  console.log('- Some features gracefully degrade when external services are unavailable');
}

// Run tests if called directly
if (require.main === module) {
  runIntegrationTests().catch(console.error);
}

module.exports = {
  runIntegrationTests,
  makeRequest,
  BASE_URL
};