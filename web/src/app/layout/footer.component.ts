import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  template: `
    <footer
      class="border-t border-surface-200 px-6 py-4 text-center text-sm text-surface-500 dark:border-surface-800 dark:text-surface-400"
    >
      © {{ year }} AdminPanel. All rights reserved.
    </footer>
  `,
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}
