/**
 * Per-test child harness for clerk-env.
 * Reads env from process.env (set by parent test), invokes hasClerkEnv(),
 * prints JSON result to stdout. Exit 0 always.
 */
import { hasClerkEnv } from '../src/lib/clerk-env.ts';
process.stdout.write(JSON.stringify({ result: hasClerkEnv() }) + '\n');