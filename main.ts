import { setFlagsFromString } from 'node:v8';
import { Worker } from 'node:worker_threads';

// The worker starts after the heap sizing flags are set, so its first allocation uses the larger young generation.
// Keeping scanner helpers out of line also reduces recompilation during a fresh run.
setFlagsFromString(
  '--no-incremental-marking --no-parallel-scavenge --no-allocation-site-pretenuring ' +
  '--min-semi-space-size=64 --max-semi-space-size=64 --no-turbo-inlining',
);

const worker = new Worker(new URL('./driver.js', import.meta.url));
worker.on('exit', (code) => { process.exitCode = code; });
