import { spawn, spawnSync } from "bun";

/**
 * Checks if a port is reachable to detect pre-existing servers.
 */
async function isPortReachable(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 200);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return true; 
  } catch {
    return false;
  }
}

/**
 * Measures the cold start time of a command by polling an HTTP endpoint.
 */
async function measureColdStart(command: string, url: string, timeout = 30000) {
  const startTime = performance.now();
  
  const child = spawn({
    cmd: [process.platform === "win32" ? "cmd" : "sh", process.platform === "win32" ? "/c" : "-c", command],
    stdout: "ignore",
    stderr: "ignore",
    stdin: "ignore"
  });

  let responseTime = -1;
  const pollStart = performance.now();

  try {
    while (performance.now() - pollStart < timeout) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 100);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok || res.status < 500) {
          responseTime = performance.now() - startTime;
          break;
        }
      } catch (e) {}
      
      if (child.exitCode !== null) {
        console.error(`\x1b[31mError: Command exited prematurely with code ${child.exitCode}\x1b[0m`);
        return -2;
      }
      await Bun.sleep(5);
    }
  } catch (err) {
    console.error(`\x1b[31mBenchmark error: ${err}\x1b[0m`);
  } finally {
    // Robust cleanup: kill entire process tree on Windows
    if (process.platform === "win32") {
      spawnSync(["taskkill", "/F", "/T", "/PID", child.pid.toString()]);
    } else {
      child.kill();
    }
  }

  return responseTime;
}

async function main() {
  const args = Bun.argv.slice(2);
  const cmdIndex = args.indexOf("--cmd");
  const urlIndex = args.indexOf("--url");
  const runsIndex = args.indexOf("--runs");

  const command = cmdIndex !== -1 ? args[cmdIndex + 1] : args[0];
  const url = urlIndex !== -1 ? args[urlIndex + 1] : args[1];
  const runs = runsIndex !== -1 ? parseInt(args[runsIndex + 1] ?? "1", 10) : (args[2] ? parseInt(args[2], 10) : 1);

  if (!command || !url) {
    console.log(`\n\x1b[1;35m⚡ BUN COLD START BENCHMARK\x1b[0m\nUsage: bun benchmark.ts <command> <url> [runs]\n`);
    process.exit(1);
    return;
  }

  // Check if port is already occupied
  if (await isPortReachable(url)) {
    console.error(`\x1b[31mError: Target URL ${url} is already responding.\x1b[0m`);
    console.log(`Please ensure the server is NOT running before starting the benchmark.`);
    process.exit(1);
    return;
  }

  console.log(`\n\x1b[1;36m┌───────────────────────────────────────────────┐\x1b[0m`);
  console.log(`\x1b[1;36m│\x1b[0m  \x1b[1;35m⚡ Bun Cold Start Benchmark\x1b[0m                \x1b[1;36m│\x1b[0m`);
  console.log(`\x1b[1;36m├───────────────────────────────────────────────┤\x1b[0m`);
  console.log(`\x1b[1;36m│\x1b[0m  \x1b[32mCommand:\x1b[0m ${command.substring(0, 35).padEnd(35)} \x1b[1;36m│\x1b[0m`);
  console.log(`\x1b[1;36m│\x1b[0m  \x1b[32mTarget:\x1b[0m  ${url.substring(0, 35).padEnd(35)} \x1b[1;36m│\x1b[0m`);
  console.log(`\x1b[1;36m│\x1b[0m  \x1b[32mRuns:\x1b[0m    ${runs.toString().padEnd(35)} \x1b[1;36m│\x1b[0m`);
  console.log(`\x1b[1;36m└───────────────────────────────────────────────┘\x1b[0m\n`);

  const results: number[] = [];

  for (let i = 0; i < runs; i++) {
    const runLabel = `Run ${i + 1}/${runs}:`;
    process.stdout.write(`  ${runLabel.padEnd(12)} `);
    const time = await measureColdStart(command, url);
    if (time > 0) {
      results.push(time);
      console.log(`\x1b[1;33m${time.toFixed(2)}ms\x1b[0m`);
    } else if (time === -2) console.log(`\x1b[31mCRASHED\x1b[0m`);
    else console.log(`\x1b[31mTIMEOUT\x1b[0m`);
    
    await Bun.sleep(1000);
  }

  if (results.length > 0) {
    const sorted = [...results].sort((a, b) => a - b);
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    console.log(`\n\x1b[1;34mSummary Statistics:\x1b[0m`);
    console.log(`  \x1b[32mAverage:\x1b[0m \x1b[1m${avg.toFixed(2)}ms\x1b[0m`);
    console.log(`  \x1b[32mMedian:\x1b[0m  \x1b[1m${median.toFixed(2)}ms\x1b[0m`);
    console.log(`  \x1b[32mMin:\x1b[0m     \x1b[1m${sorted[0].toFixed(2)}ms\x1b[0m`);
    console.log(`  \x1b[32mMax:\x1b[0m     \x1b[1m${sorted[sorted.length-1].toFixed(2)}ms\x1b[0m\n`);
  }
}

main();
