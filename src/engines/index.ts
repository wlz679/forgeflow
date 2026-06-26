// Auto-aggregate all engines from subdirectories.
// import.meta.glob is Vite/Astro-native: zero maintenance, zero runtime cost.
// Side effects (registerEngine) run on import; the return value is intentionally unused.
import.meta.glob<unknown>('./*/*.ts', { eager: true });
