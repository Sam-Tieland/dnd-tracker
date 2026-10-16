export type ThemeSetting = 'light' | 'dark' | 'auto';

/** 'auto' follows the device through prefers-color-scheme; light and dark are forced with data-theme on <html>. */
export function applyTheme(theme: ThemeSetting, root: HTMLElement = document.documentElement): void {
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}
