import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export interface LanguageOption {
  code: 'en' | 'uz';
  label: string;
}

const LANG_KEY = 'app-lang';

/** Runtime language state (ngx-translate), persisted. Replaces i18next usage. */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);

  readonly languages: LanguageOption[] = [
    { code: 'en', label: 'English' },
    { code: 'uz', label: "O'zbek" },
  ];

  readonly current = signal<string>(localStorage.getItem(LANG_KEY) ?? 'en');

  constructor() {
    this.translate.addLangs(['en', 'uz']);
    this.translate.use(this.current());
  }

  use(code: string): void {
    this.current.set(code);
    localStorage.setItem(LANG_KEY, code);
    this.translate.use(code);
  }
}
