import { Component, inject, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';

import { LayoutService } from '../core/services/layout.service';
import { AuthService } from '../core/services/auth.service';
import { ADMIN_NAV, MAIN_NAV, SECONDARY_NAV } from './nav';

@Component({
  selector: 'app-sidebar',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    RouterLinkActive,
    TranslateModule,
    AvatarModule,
    DividerModule,
    TooltipModule,
  ],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  /** Expanded = labels visible (w-64); collapsed = icons only (w-16). */
  readonly expanded = input(true);

  readonly layout = inject(LayoutService);
  readonly auth = inject(AuthService);

  readonly mainNav = MAIN_NAV;
  readonly adminNav = ADMIN_NAV;
  readonly secondaryNav = SECONDARY_NAV;
  readonly appName = 'jwc-shortener';

  /** Active-link classes shared by every nav anchor. */
  readonly activeClass =
    'bg-primary-50 font-medium text-primary-700 dark:bg-primary-400/10 dark:text-primary-300';

  onNavigate(): void {
    if (this.layout.isMobile()) {
      this.layout.closeMobile();
    }
  }
}
