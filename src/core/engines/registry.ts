import type { ToolEngine } from './types';

const engines: Record<string, ToolEngine> = {};

export function getEngine(slug: string): ToolEngine | undefined {
  return engines[slug];
}

export function getAllEngines(): ToolEngine[] {
  return Object.values(engines);
}

export function registerEngine(engine: ToolEngine): void {
  if (engines[engine.slug] !== undefined) {
    // Two engines sharing a slug would silently shadow each other. Surface it.
    console.warn(`[registry] registerEngine: duplicate slug "${engine.slug}" — overwriting existing engine`);
  }
  engines[engine.slug] = engine;
}
