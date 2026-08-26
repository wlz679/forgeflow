/**
 * Lightweight toast helper (Phase 5-A).
 *
 * Per spec §4.4: 4 variants (success / error / info / warn), 3s auto-dismiss,
 * max 3 stacked (latest on top), no new library.
 *
 * Why not a UI lib: this site has zero React/Vue/Pinia and minimal JS.
 * Adding a toast lib for one component is overkill — DOM divs do fine.
 */

export type ToastVariant = 'success' | 'error' | 'info' | 'warn';

const VARIANT_ICONS: Record<ToastVariant, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warn: '⚠',
};

const VARIANT_COLORS: Record<ToastVariant, string> = {
  success: '#10b981',
  error: '#ef4444',
  info: '#3b82f6',
  warn: '#f59e0b',
};

const MAX_TOASTS = 3;

export function showToast(message: string, variant: ToastVariant, durationMs = 3000): void {
  if (typeof document === 'undefined') return; // SSR guard
  let container = document.getElementById('ffk-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'ffk-toast-container';
    container.style.cssText =
      'position:fixed;top:1rem;right:1rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;pointer-events:none;';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', variant === 'error' ? 'assertive' : 'polite');
  toast.style.cssText = `
    background:${VARIANT_COLORS[variant]};color:white;padding:0.75rem 1rem;
    border-radius:0.5rem;box-shadow:0 4px 6px rgba(0,0,0,0.1);
    font-size:0.875rem;max-width:24rem;pointer-events:auto;
    display:flex;align-items:center;gap:0.5rem;
  `;
  toast.innerHTML = `<span aria-hidden="true">${VARIANT_ICONS[variant]}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  while (container.children.length > MAX_TOASTS) {
    container.removeChild(container.firstChild!);
  }
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, durationMs);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]!));
}
