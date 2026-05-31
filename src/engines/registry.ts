import type { ToolEngine } from './types';

const engines: Record<string, ToolEngine> = {};

export function getEngine(slug: string): ToolEngine | undefined {
  return engines[slug];
}

export function getAllEngines(): ToolEngine[] {
  return Object.values(engines);
}

export function registerEngine(engine: ToolEngine): void {
  engines[engine.slug] = engine;
}
