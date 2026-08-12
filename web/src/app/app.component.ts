import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';

import { ThemeService } from './core/services/theme.service';
import { LanguageService } from './core/services/language.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastModule],
  template: `
    <p-toast position="top-right" />
    <router-outlet />
  `,
})
export class AppComponent {
  constructor() {
    // Instantiate early so theme (.app-dark) and language are applied at boot.
    inject(ThemeService);
    inject(LanguageService);
  }
}
