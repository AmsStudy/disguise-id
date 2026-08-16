const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = path.resolve(__dirname, '../disguise-backend/logs/ml-v2-shadow.jsonl');

async function processLineByLine() {
  if (!fs.existsSync(logPath)) {
    console.error(`Log file not found: ${logPath}`);
    process.exit(1);
  }

  const fileStream = fs.createReadStream(logPath);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const stats = {
    total_entries: 0,
    parity_entries: 0,
    cosine_sims: [],
    l2_dists: [],
    model_mismatches: 0,
  };

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      stats.total_entries++;
      
      if (entry.model_hash_mismatch) {
        stats.model_mismatches++;
      }

      if (typeof entry.cosine_similarity === 'number' && typeof entry.l2_distance === 'number') {
        stats.parity_entries++;
        stats.cosine_sims.push(entry.cosine_similarity);
        stats.l2_dists.push(entry.l2_distance);
      }
    } catch (e) {
      console.warn('Failed to parse line:', line);
    }
  }

  console.log('================================================');
  console.log('       EDGE / SERVER PARITY REPORT');
  console.log('================================================');
  console.log(`Total Log Entries      : ${stats.total_entries}`);
  console.log(`Parity Entries         : ${stats.parity_entries}`);
  console.log(`Model Hash Mismatches  : ${stats.model_mismatches}`);
  
  if (stats.parity_entries === 0) {
    console.log('\nNo parity metrics found in logs.');
    return;
  }

  // Helper to calculate statistics
  const calc = (arr) => {
    arr.sort((a, b) => a - b);
    const sum = arr.reduce((a, b) => a + b, 0);
    const mean = sum / arr.length;
    const squaredDiffs = arr.map(x => Math.pow(x - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / arr.length;
    const std = Math.sqrt(variance);
    
    return {
      min: arr[0],
      max: arr[arr.length - 1],
      mean,
      std,
      p01: arr[Math.floor(arr.length * 0.01)] || arr[0],
      p05: arr[Math.floor(arr.length * 0.05)] || arr[0],
      p50: arr[Math.floor(arr.length * 0.5)] || arr[0],
      p95: arr[Math.floor(arr.length * 0.95)] || arr[arr.length - 1],
      p99: arr[Math.floor(arr.length * 0.99)] || arr[arr.length - 1],
    };
  };

  const cosineStats = calc(stats.cosine_sims);
  const l2Stats = calc(stats.l2_dists);

  console.log('\n--- COSINE SIMILARITY ---');
  console.log(`Mean   : ${cosineStats.mean.toFixed(6)} ± ${cosineStats.std.toFixed(6)}`);
  console.log(`Min    : ${cosineStats.min.toFixed(6)}`);
  console.log(`P01    : ${cosineStats.p01.toFixed(6)}`);
  console.log(`P05    : ${cosineStats.p05.toFixed(6)}`);
  console.log(`Median : ${cosineStats.p50.toFixed(6)}`);
  console.log(`P95    : ${cosineStats.p95.toFixed(6)}`);
  console.log(`P99    : ${cosineStats.p99.toFixed(6)}`);
  console.log(`Max    : ${cosineStats.max.toFixed(6)}`);

  console.log('\n--- L2 DISTANCE ---');
  console.log(`Mean   : ${l2Stats.mean.toFixed(6)} ± ${l2Stats.std.toFixed(6)}`);
  console.log(`Min    : ${l2Stats.min.toFixed(6)}`);
  console.log(`Median : ${l2Stats.p50.toFixed(6)}`);
  console.log(`Max    : ${l2Stats.max.toFixed(6)}`);
  console.log('================================================\n');
}

processLineByLine();
