import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { LayoutService } from '../core/services/layout.service';
import { AuthService } from '../core/services/auth.service';
import { LanguageService } from '../core/services/language.service';
import { ThemeService } from '../core/services/theme.service';

@Component({
  selector: 'app-topbar',
  imports: [
    ButtonModule,
    MenuModule,
    AvatarModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    TooltipModule,
    TranslateModule,
  ],
  templateUrl: './topbar.component.html',
})
export class TopbarComponent {
  readonly layout = inject(LayoutService);
  readonly auth = inject(AuthService);
  readonly language = inject(LanguageService);
  readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly appName = 'jwc-shortener';
  readonly showSearch = signal(false);

  readonly langItems = computed<MenuItem[]>(() =>
    this.language.languages.map((l) => ({
      label: l.label,
      icon: this.language.current() === l.code ? 'pi pi-check' : 'pi pi-globe',
      command: () => this.language.use(l.code),
    })),
  );

  // Recomputed when the language changes so labels stay translated.
  readonly userItems = computed<MenuItem[]>(() => {
    this.language.current();
    return [
      {
        label: this.translate.instant('nav.profile'),
        icon: 'pi pi-user',
        command: () => this.router.navigate(['/profile']),
      },
      {
        label: this.translate.instant('nav.settings'),
        icon: 'pi pi-cog',
        command: () => this.router.navigate(['/settings']),
      },
      { separator: true },
      {
        label: this.translate.instant('nav.logout'),
        icon: 'pi pi-sign-out',
        command: () => this.logout(),
      },
    ];
  });

  /**
   * No local navigation afterwards: `AuthService.logout()` ends the platform
   * session too, which means a full-page redirect to musanna and back to
   * `postLogoutRedirectUri`. Routing to `/login` here would race that
   * redirect.
   */
  logout(): void {
    this.auth.logout();
  }
}
