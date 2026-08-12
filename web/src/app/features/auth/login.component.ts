import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { TabsModule } from 'primeng/tabs';
import { MessageModule } from 'primeng/message';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../core/services/auth.service';

/**
 * Sign in / register against musanna-platform, then hand off to OIDC.
 *
 * The password is posted to musanna, never stored here; what this app ends
 * up holding is an access token obtained through authorization-code + PKCE.
 *
 * Registration is a three-step flow on musanna's side — register, confirm the
 * phone with an SMS code, then sign in. In Development the platform returns
 * the code in the response body instead of sending an SMS, and the form fills
 * it in so the flow can be walked through locally.
 */
@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    TabsModule,
    MessageModule,
    TranslateModule,
  ],
  template: `
    <div
      class="flex min-h-screen items-center justify-center bg-surface-50 p-4 text-surface-900 dark:bg-surface-950 dark:text-surface-0"
    >
      <div
        class="w-full max-w-md rounded-2xl border border-surface-200 bg-surface-0 p-8 shadow-sm dark:border-surface-800 dark:bg-surface-900"
      >
        <div class="mb-6 flex items-center gap-3">
          <span class="inline-block h-8 w-8 rounded-lg bg-primary-500"></span>
          <div>
            <h1 class="text-xl font-bold leading-tight">jwc-shortener</h1>
            <p class="text-sm text-surface-500 dark:text-surface-400">
              {{ 'auth.subtitle' | translate }}
            </p>
          </div>
        </div>

        @if (error()) {
          <p-message severity="error" [text]="error()!" styleClass="mb-4 w-full" />
        }
        @if (info()) {
          <p-message severity="success" [text]="info()!" styleClass="mb-4 w-full" />
        }

        <p-tabs value="in">
          <p-tablist>
            <p-tab value="in">{{ 'auth.sign_in' | translate }}</p-tab>
            <p-tab value="up">{{ 'auth.sign_up' | translate }}</p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel value="in">
              <form [formGroup]="signInForm" (ngSubmit)="signIn()" class="flex flex-col gap-4 pt-2">
                <div class="flex flex-col gap-1">
                  <label for="identifier" class="text-sm font-medium">
                    {{ 'auth.identifier' | translate }}
                  </label>
                  <input id="identifier" pInputText formControlName="identifier" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                  <label for="password" class="text-sm font-medium">
                    {{ 'auth.password' | translate }}
                  </label>
                  <p-password
                    inputId="password"
                    formControlName="password"
                    [toggleMask]="true"
                    [feedback]="false"
                    styleClass="w-full"
                    inputStyleClass="w-full"
                  />
                </div>
                <p-button
                  type="submit"
                  [label]="'auth.sign_in' | translate"
                  styleClass="w-full"
                  [loading]="busy()"
                />
              </form>
            </p-tabpanel>

            <p-tabpanel value="up">
              @if (!pendingUserId()) {
                <form [formGroup]="signUpForm" (ngSubmit)="register()" class="flex flex-col gap-4 pt-2">
                  <div class="grid grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1">
                      <label for="firstName" class="text-sm font-medium">
                        {{ 'auth.first_name' | translate }}
                      </label>
                      <input id="firstName" pInputText formControlName="firstName" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-1">
                      <label for="lastName" class="text-sm font-medium">
                        {{ 'auth.last_name' | translate }}
                      </label>
                      <input id="lastName" pInputText formControlName="lastName" class="w-full" />
                    </div>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label for="phone" class="text-sm font-medium">
                      {{ 'auth.phone' | translate }}
                    </label>
                    <input id="phone" pInputText formControlName="phone" placeholder="+99890..." class="w-full" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label for="email" class="text-sm font-medium">
                      {{ 'auth.email_optional' | translate }}
                    </label>
                    <input id="email" pInputText type="email" formControlName="email" class="w-full" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label for="newPassword" class="text-sm font-medium">
                      {{ 'auth.new_password' | translate }}
                    </label>
                    <p-password
                      inputId="newPassword"
                      formControlName="password"
                      [toggleMask]="true"
                      styleClass="w-full"
                      inputStyleClass="w-full"
                    />
                  </div>
                  <p-button
                    type="submit"
                    [label]="'auth.sign_up' | translate"
                    styleClass="w-full"
                    [loading]="busy()"
                  />
                </form>
              } @else {
                <form [formGroup]="otpForm" (ngSubmit)="confirm()" class="flex flex-col gap-4 pt-2">
                  <div class="flex flex-col gap-1">
                    <label for="code" class="text-sm font-medium">
                      {{ 'auth.sms_code' | translate }}
                    </label>
                    <input id="code" pInputText formControlName="code" class="w-full font-mono" />
                  </div>
                  <p-button
                    type="submit"
                    [label]="'auth.confirm' | translate"
                    styleClass="w-full"
                    [loading]="busy()"
                  />
                </form>
              }
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly translate = inject(TranslateService);

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  readonly pendingUserId = signal<string | null>(null);

  // Pre-filled with the seeded superadmin so a fresh checkout can sign in.
  readonly signInForm = this.fb.nonNullable.group({
    identifier: ['+998900000000', [Validators.required]],
    password: ['SuperAdmin1', [Validators.required]],
  });

  readonly signUpForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required]],
    lastName: [''],
    phone: ['', [Validators.required, Validators.minLength(7)]],
    email: [''],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly otpForm = this.fb.nonNullable.group({
    code: ['', [Validators.required]],
  });

  async signIn(): Promise<void> {
    if (this.signInForm.invalid) {
      this.signInForm.markAllAsTouched();
      return;
    }
    await this.run(async () => {
      const { identifier, password } = this.signInForm.getRawValue();
      const { requiresTwoFactor } = await this.auth.signIn(identifier, password);
      if (requiresTwoFactor) {
        throw new Error(this.translate.instant('auth.two_factor_unsupported'));
      }
      // Leaves the SPA: musanna issues the code and redirects to /auth/callback.
      this.auth.authorize();
    });
  }

  async register(): Promise<void> {
    if (this.signUpForm.invalid) {
      this.signUpForm.markAllAsTouched();
      return;
    }
    await this.run(async () => {
      const v = this.signUpForm.getRawValue();
      const res = await this.auth.register({
        phone: v.phone,
        password: v.password,
        firstName: v.firstName,
        lastName: v.lastName || null,
        email: v.email || null,
      });
      this.pendingUserId.set(res.userId);
      if (res.phoneConfirmationCode) {
        this.otpForm.patchValue({ code: res.phoneConfirmationCode });
        this.info.set(this.translate.instant('auth.created_dev'));
      } else {
        this.info.set(this.translate.instant('auth.created'));
      }
    });
  }

  async confirm(): Promise<void> {
    if (this.otpForm.invalid) {
      return;
    }
    await this.run(async () => {
      const v = this.signUpForm.getRawValue();
      await this.auth.confirmPhone(this.pendingUserId()!, this.otpForm.getRawValue().code);
      await this.auth.signIn(v.phone, v.password);
      this.auth.authorize();
    });
  }

  private async run(fn: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await fn();
    } catch (e) {
      this.error.set(this.message(e));
    } finally {
      this.busy.set(false);
    }
  }

  /** musanna answers with `{error}` / `{message}`; fall back to the status. */
  private message(e: unknown): string {
    if (e instanceof HttpErrorResponse) {
      const body = e.error as { error?: string; message?: string; detail?: string } | null;
      return body?.error ?? body?.message ?? body?.detail ?? `HTTP ${e.status}`;
    }
    return (e as Error)?.message ?? this.translate.instant('common.error');
  }
}
