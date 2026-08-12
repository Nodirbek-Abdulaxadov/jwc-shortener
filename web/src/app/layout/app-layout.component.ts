import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';

import { LayoutService } from '../core/services/layout.service';
import { SidebarComponent } from './sidebar.component';
import { TopbarComponent } from './topbar.component';
import { FooterComponent } from './footer.component';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, DrawerModule, SidebarComponent, TopbarComponent, FooterComponent],
  templateUrl: './app-layout.component.html',
})
export class AppLayoutComponent {
  readonly layout = inject(LayoutService);
}
