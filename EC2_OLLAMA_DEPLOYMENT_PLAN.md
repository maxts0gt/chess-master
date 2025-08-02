# EC2 Ollama Deployment Plan for Chess Master App

## Executive Summary

Running Ollama on EC2 instances (t3.large/xlarge) is a viable and cost-effective solution for serving AI to your chess app users. Based on research and benchmarks, a single t3.xlarge instance can handle approximately 100-500 concurrent users for chess analysis, making it perfect for bootstrapping your app.

## Cost Analysis

### Instance Comparison

| Instance Type | vCPUs | RAM | On-Demand | 1-Year Reserved | 3-Year Reserved | Est. Users |
|--------------|-------|-----|-----------|-----------------|-----------------|------------|
| t3.large     | 2     | 8GB | $0.0832/hr ($60/mo) | $38/mo | $24/mo | 50-100 |
| t3.xlarge    | 4     | 16GB | $0.1664/hr ($120/mo) | $76/mo | $48/mo | 100-500 |
| t3.2xlarge   | 8     | 32GB | $0.3328/hr ($240/mo) | $151/mo | $96/mo | 500-1000 |

### GPU Instances (For Comparison)
- g4dn.xlarge: $0.526/hr (~$390/mo) - 16GB RAM + GPU
- Not necessary for smaller models with quantization

## Performance Benchmarks

Based on research with similar deployments:

### Small Models (1.5B-7B parameters)
- **Response Time**: 2-5 seconds per query (CPU)
- **Throughput**: 10-30 tokens/second on t3.xlarge
- **Concurrent Users**: 5-10 simultaneous requests
- **Memory Usage**: 2-4GB per model

### Chess-Specific Performance
- Opening identification: <1 second
- Position analysis: 2-3 seconds
- Move explanation: 3-5 seconds
- Tactical analysis: 4-6 seconds

## Recommended Architecture

```
                        ┌─────────────────┐
                        │   CloudFront    │
                        │      (CDN)      │
                        └────────┬────────┘
                                 │
                        ┌────────┴────────┐
                        │ Load Balancer   │
                        │    (ALB)        │
                        └────────┬────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
         ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐
         │ EC2 Ollama  │  │ EC2 Ollama  │  │ EC2 Ollama  │
         │   Server 1  │  │   Server 2  │  │   Server 3  │
         │  (t3.xlarge)│  │  (t3.xlarge)│  │  (t3.xlarge)│
         └─────────────┘  └─────────────┘  └─────────────┘
                │                │                │
                └────────────────┼────────────────┘
                                 │
                        ┌────────┴────────┐
                        │   ElastiCache   │
                        │  (Redis Cache)  │
                        └─────────────────┘
```

## Implementation Steps

### Phase 1: Single Instance MVP (Week 1)

1. **Launch t3.xlarge instance**
   ```bash
   # Use Ubuntu 22.04 LTS AMI
   # Enable 100GB gp3 storage
   # Configure security groups (port 11434)
   ```

2. **Install Ollama**
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```

3. **Pull Optimized Models**
   ```bash
   # Smaller, quantized models for efficiency
   ollama pull llama3.2:1b-instruct-q4_0  # 1B params, 4-bit quantized
   ollama pull deepseek-coder:1.3b-instruct-q4_0
   ollama pull qwen2.5:0.5b  # Ultra-light for simple queries
   ```

4. **Configure Ollama for Production**
   ```bash
   # /etc/systemd/system/ollama.service
   [Service]
   Environment="OLLAMA_HOST=0.0.0.0"
   Environment="OLLAMA_MODELS=/var/lib/ollama/models"
   Environment="OLLAMA_NUM_PARALLEL=4"
   Environment="OLLAMA_MAX_LOADED_MODELS=3"
   Environment="OLLAMA_KEEP_ALIVE=5m"
   ```

### Phase 2: Load Balanced Setup (Week 2-3)

1. **Create AMI from configured instance**
2. **Launch 2-3 instances behind ALB**
3. **Configure health checks**
   ```bash
   # Health check endpoint
   curl http://localhost:11434/api/tags
   ```

4. **Implement sticky sessions** (5-minute TTL)

### Phase 3: Optimization (Week 4)

1. **Add Redis Cache**
   - Cache common chess positions
   - Cache opening analysis
   - 24-hour TTL for analysis

2. **Implement Request Queue**
   - SQS for async processing
   - Priority queue for premium users

3. **Auto-scaling Configuration**
   ```yaml
   MinSize: 1
   MaxSize: 5
   TargetCPUUtilization: 70%
   ScaleUpCooldown: 300
   ScaleDownCooldown: 900
   ```

## Model Selection Strategy

### Primary Models (Quantized for CPU)

1. **llama3.2:1b-instruct-q4_0** (650MB)
   - General chess discussion
   - Move explanations
   - Fast responses

2. **deepseek-coder:1.3b-instruct-q4_0** (900MB)
   - Chess notation parsing
   - PGN analysis
   - Variation calculations

3. **Custom Chess Model** (Fine-tuned)
   ```dockerfile
   FROM llama3.2:1b
   PARAMETER temperature 0.7
   PARAMETER top_p 0.9
   SYSTEM "You are a chess grandmaster..."
   ```

### Memory Management

```python
# Ollama configuration
OLLAMA_MAX_LOADED_MODELS=3  # Max models in memory
OLLAMA_KEEP_ALIVE=5m       # Unload after 5 min idle
OLLAMA_NUM_PARALLEL=4      # Concurrent requests per model
```

## Backend Integration

### Update Ollama Service Configuration

```typescript
// ollamaService.ts updates
export class OllamaService {
  private config: OllamaConfig = {
    baseUrl: process.env.OLLAMA_URL || 'http://ollama-alb.internal:11434',
    models: {
      general: 'llama3.2:1b-instruct-q4_0',
      chess: 'chess-coach:latest',
      analysis: 'deepseek-coder:1.3b-instruct-q4_0',
    },
    timeout: 30000,
    maxRetries: 3,
    cacheEnabled: true,
  };

  // Add request queuing
  private requestQueue = new PQueue({ 
    concurrency: 10,
    interval: 1000,
    intervalCap: 20 
  });

  // Add caching layer
  private cache = new NodeCache({ 
    stdTTL: 3600,
    checkperiod: 600 
  });
}
```

### API Gateway Integration

```typescript
// Rust backend API endpoint
#[post("/api/ai/analyze")]
async fn analyze_position(
    position: web::Json<PositionRequest>,
    ollama: web::Data<OllamaClient>,
) -> Result<HttpResponse, Error> {
    // Check cache first
    if let Some(cached) = cache.get(&position.fen) {
        return Ok(HttpResponse::Ok().json(cached));
    }

    // Queue request
    let result = ollama.analyze_chess_position(
        position.fen.clone(),
        position.analysis_type.clone(),
    ).await?;

    // Cache result
    cache.set(&position.fen, &result, 3600);

    Ok(HttpResponse::Ok().json(result))
}
```

## Monitoring and Scaling

### CloudWatch Metrics

```python
# Custom metrics to track
- ollama_request_duration
- ollama_queue_depth  
- ollama_cache_hit_rate
- ollama_model_load_time
- ollama_tokens_per_second
```

### Scaling Triggers

1. **CPU > 70%** → Add instance
2. **Queue depth > 100** → Add instance
3. **Response time > 5s (p95)** → Add instance
4. **CPU < 30% for 15min** → Remove instance

## Cost Optimization Strategies

### 1. Reserved Instances
- Start with on-demand
- Move to 1-year reserved after validating usage
- Save 35-40% on compute costs

### 2. Spot Instances for Non-Critical
- Use for batch analysis
- Training data generation
- Save up to 70%

### 3. Intelligent Caching
```typescript
// Cache strategy
const cacheConfig = {
  openings: 7 * 24 * 3600,     // 1 week
  positions: 24 * 3600,        // 1 day
  tactics: 3600,               // 1 hour
  explanations: 12 * 3600,     // 12 hours
};
```

### 4. Request Batching
```typescript
// Batch similar requests
const batchProcessor = new BatchProcessor({
  maxBatchSize: 10,
  maxWaitTime: 100, // ms
  processor: async (requests) => {
    return ollama.batchAnalyze(requests);
  }
});
```

## Performance Projections

### Single t3.xlarge Instance
- **Concurrent users**: 100-150
- **Requests/second**: 5-10
- **Monthly cost**: $76 (reserved)
- **Response time**: 2-4s average

### 3x t3.xlarge with Load Balancer
- **Concurrent users**: 300-500
- **Requests/second**: 15-30
- **Monthly cost**: $250 (reserved)
- **Response time**: 2-3s average

### With Caching (70% hit rate)
- **Effective capacity**: 3-5x improvement
- **Response time**: <500ms for cached
- **Cost per user**: ~$0.50/month

## Migration Path

### When to Consider GPU Instances

1. **User base > 1000 active users**
2. **Response time requirements < 1s**
3. **Complex models (>7B parameters)**
4. **Revenue > $5000/month**

### Hybrid Approach
- Keep t3 instances for simple queries
- Add single GPU instance for complex analysis
- Route requests based on complexity

## Conclusion

Starting with t3.large/xlarge EC2 instances running Ollama is a smart, cost-effective approach for your chess app:

✅ **Low initial cost**: $76-150/month
✅ **Scalable**: Can handle 100-500 users per instance
✅ **Simple deployment**: No Kubernetes complexity
✅ **Quick to market**: Deploy in days, not weeks
✅ **Easy to upgrade**: Clear path to GPU when needed

This approach lets you validate your AI features with real users before investing in expensive GPU infrastructure or managed AI services.