/**
 * Per-test child harness for supabase-env.
 * Reads env from process.env (set by parent test), invokes hasSupabaseEnv(),
 * prints JSON result to stdout. Exit 0 always.
 */
import { hasSupabaseEnv } from '../src/lib/supabase-env.ts';
process.stdout.write(JSON.stringify({ result: hasSupabaseEnv() }) + '\n');
