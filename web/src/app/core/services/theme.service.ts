import { Injectable, effect, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

/**
 * Dark/light theme, persisted to localStorage. Toggles `.app-dark` on the
 * <html> element, which is what both PrimeNG (darkModeSelector) and Tailwind
 * (darkMode: ['selector', '.app-dark']) key off. Replaces next-themes.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'app-theme';
  readonly theme = signal<Theme>(this.initialTheme());

  constructor() {
    effect(() => {
      const theme = this.theme();
      document.documentElement.classList.toggle('app-dark', theme === 'dark');
      localStorage.setItem(this.storageKey, theme);
    });
  }

  toggle(): void {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  set(theme: Theme): void {
    this.theme.set(theme);
  }

  private initialTheme(): Theme {
    const saved = localStorage.getItem(this.storageKey) as Theme | null;
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
}
