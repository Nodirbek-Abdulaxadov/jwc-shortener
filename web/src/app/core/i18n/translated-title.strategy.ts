import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

const APP_SUFFIX = 'jwc-shortener';

/**
 * Route `title` values are translation KEYS (`title.links`), not text.
 *
 * The key is remembered so the tab title is re-rendered when the language
 * changes — without that, switching language would leave the old title until
 * the next navigation.
 */
@Injectable({ providedIn: 'root' })
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly translate = inject(TranslateService);

  private currentKey: string | undefined;

  constructor() {
    super();
    this.translate.onLangChange.subscribe(() => this.apply(this.currentKey));
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.currentKey = this.buildTitle(snapshot);
    this.apply(this.currentKey);
  }

  private apply(key: string | undefined): void {
    if (key === undefined) {
      this.title.setTitle(APP_SUFFIX);
      return;
    }
    const translated = this.translate.instant(key);
    // `instant` echoes the key back when the bundle has no entry for it;
    // showing "title.links" in the tab would be worse than showing nothing.
    this.title.setTitle(`${translated === key ? '' : translated} · ${APP_SUFFIX}`.trim());
  }
}
