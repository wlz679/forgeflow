import { getEngine } from '../src/core/engines/registry.ts';
import PRICING from '../src/data/ai-pricing.json';

const results: Record<string, string[]> = {};

// openai-token-calculator.ts
await import('../src/engines/openai-token-calculator.ts');
{
  const engine = getEngine('solopreneur-openai-token-calculator');
  if (!engine) { console.error('No engine registered for solopreneur-openai-token-calculator'); process.exit(1); }
  results['solopreneur-openai-token-calculator'] = engine.generate({"models":"gpt-5-mini,gpt-5.5,gpt-4.1","inputTokens":"1000","outputTokens":"500","requestsPerDay":"100","pricingMode":"realtime","cacheHitRate":"0","growthRate":"0"});
}

// claude-api-cost-calculator.ts
await import('../src/engines/claude-api-cost-calculator.ts');
{
  const engine = getEngine('solopreneur-claude-api-cost-calculator');
  if (!engine) { console.error('No engine registered for solopreneur-claude-api-cost-calculator'); process.exit(1); }
  results['solopreneur-claude-api-cost-calculator'] = engine.generate({"models":"claude-sonnet-4-6,claude-haiku-4-5,claude-fable-5","inputTokens":"1000","outputTokens":"500","requestsPerDay":"100","pricingMode":"realtime","cacheHitRate":"0","growthRate":"0"});
}

// gemini-api-cost-calculator.ts
await import('../src/engines/gemini-api-cost-calculator.ts');
{
  const engine = getEngine('solopreneur-gemini-api-cost-calculator');
  if (!engine) { console.error('No engine registered for solopreneur-gemini-api-cost-calculator'); process.exit(1); }
  results['solopreneur-gemini-api-cost-calculator'] = engine.generate({"models":"gemini-3.5-flash,gemini-3.1-pro","inputTokens":"1000","outputTokens":"500","requestsPerDay":"100","pricingMode":"realtime","cacheHitRate":"0","growthRate":"0"});
}

// deepseek-api-cost-calculator.ts
await import('../src/engines/deepseek-api-cost-calculator.ts');
{
  const engine = getEngine('solopreneur-deepseek-api-cost-calculator');
  if (!engine) { console.error('No engine registered for solopreneur-deepseek-api-cost-calculator'); process.exit(1); }
  results['solopreneur-deepseek-api-cost-calculator'] = engine.generate({"models":"deepseek-v4-flash,deepseek-v4-pro-promo","inputTokens":"1000","outputTokens":"500","requestsPerDay":"100","pricingMode":"realtime","cacheHitRate":"0","growthRate":"0"});
}

// ai-api-cost-comparison.ts
await import('../src/engines/ai-api-cost-comparison.ts');
{
  const engine = getEngine('solopreneur-ai-api-cost-comparison');
  if (!engine) { console.error('No engine registered for solopreneur-ai-api-cost-comparison'); process.exit(1); }
  results['solopreneur-ai-api-cost-comparison'] = engine.generate({"models":"gpt-5-mini,claude-sonnet-4-6,gemini-3.5-flash,deepseek-v4-flash","inputTokens":"1000","outputTokens":"500","requestsPerDay":"100"});
}

// ai-image-generation-cost-calculator.ts
await import('../src/engines/ai-image-generation-cost-calculator.ts');
{
  const engine = getEngine('solopreneur-ai-image-cost-calculator');
  if (!engine) { console.error('No engine registered for solopreneur-ai-image-cost-calculator'); process.exit(1); }
  results['solopreneur-ai-image-cost-calculator'] = engine.generate({"provider":"dalle-3","imagesPerMonth":"100","resolution":"1024×1024","batchSize":"1","advancedMode":"standard"});
}

// gpu-cloud-cost-calculator.ts
await import('../src/engines/gpu-cloud-cost-calculator.ts');
{
  const engine = getEngine('solopreneur-gpu-cloud-cost-calculator');
  if (!engine) { console.error('No engine registered for solopreneur-gpu-cloud-cost-calculator'); process.exit(1); }
  results['solopreneur-gpu-cloud-cost-calculator'] = engine.generate({"provider":"runpod","gpu":"A100","hoursPerMonth":"100","storageGB":"100","egressGB":"50"});
}

// ai-training-cost-estimator.ts
await import('../src/engines/ai-training-cost-estimator.ts');
{
  const engine = getEngine('solopreneur-ai-training-cost-estimator');
  if (!engine) { console.error('No engine registered for solopreneur-ai-training-cost-estimator'); process.exit(1); }
  results['solopreneur-ai-training-cost-estimator'] = engine.generate({"gpuType":"A100-80GB","modelSize":"7B","numGpus":"8","trainingHours":"24","epochs":"3","storageGB":"500","dataProcessGB":"1000"});
}

process.stdout.write(JSON.stringify(results));