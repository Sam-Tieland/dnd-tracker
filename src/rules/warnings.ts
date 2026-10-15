import type { Warning } from './types';

export function warnOnce(warnings: Warning[], warning: Warning): void {
  if (!warnings.some((w) => w.code === warning.code && w.detail === warning.detail)) warnings.push(warning);
}

export function unknownContent(warnings: Warning[], id: string): void {
  warnOnce(warnings, { code: 'unknown-content', detail: id });
}
