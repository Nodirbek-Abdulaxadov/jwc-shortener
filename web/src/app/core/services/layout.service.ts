import { Injectable, computed, signal } from '@angular/core';

const SIDEBAR_BREAKPOINT = 1024; // lg
const SIDEBAR_STATE_KEY = 'ui.sidebarOpen';

/**
 * Sidebar / responsive state. Mirrors breezy's AppLayout:
 * - desktop (>= 1024px): persistent sidebar, collapsed/expanded, state persisted.
 * - mobile (< 1024px): off-canvas drawer.
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly isMobile = signal(this.computeMobile());
  readonly desktopOpen = signal(this.initialDesktopOpen());
  readonly mobileOpen = signal(false);

  /** Whether the sidebar content is shown expanded (labels visible). */
  readonly sidebarOpen = computed(() =>
    this.isMobile() ? this.mobileOpen() : this.desktopOpen(),
  );

  constructor() {
    window.addEventListener('resize', () => {
      const mobile = this.computeMobile();
      this.isMobile.set(mobile);
      if (!mobile) {
        this.mobileOpen.set(false); // close drawer when growing to desktop
      }
    });
  }

  toggle(): void {
    if (this.isMobile()) {
      this.mobileOpen.update((v) => !v);
    } else {
      this.desktopOpen.update((v) => !v);
      localStorage.setItem(SIDEBAR_STATE_KEY, String(this.desktopOpen()));
    }
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  private computeMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < SIDEBAR_BREAKPOINT;
  }

  private initialDesktopOpen(): boolean {
    const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
    return saved === null ? true : saved === 'true';
  }
}
