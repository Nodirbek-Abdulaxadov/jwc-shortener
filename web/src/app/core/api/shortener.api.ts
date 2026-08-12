import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface Link {
  code: string;
  url: string;
  hits: number;
  status: string;
  created_at: string;
  expires_at: string | null;
}

export interface AdminLink extends Link {
  dest_host: string;
  owner_sub: string;
  owner_email: string | null;
  deleted_at: string | null;
}

export interface CreatedLink {
  code: string;
  short: string;
  qr: string;
}

export interface AdminUser {
  sub: string;
  email: string | null;
  status: string;
  created_at: string;
  links: number;
  clicks: number;
}

export interface AdminStats {
  links: number;
  users: number;
  blocked: number;
  clicks: number;
  series: { day: string; hits: number }[];
  top: { code: string; url: string; hits: number }[];
}

export interface PublicStats {
  links: number;
  clicks: number;
  today: number;
}

/**
 * The JWC service. The bearer token is attached by `authInterceptor()` for
 * every URL under `apiBaseUrl` (see `auth.config.ts`), so nothing here
 * touches headers.
 */
@Injectable({ providedIn: 'root' })
export class ShortenerApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /** Public short URL for a code — what the user copies and shares. */
  shortUrl(code: string): string {
    return `${this.base}/${code}`;
  }

  // ---- signed-in user ----

  myLinks(): Promise<{ data: Link[] }> {
    return firstValueFrom(this.http.get<{ data: Link[] }>(`${this.base}/api/me/links`));
  }

  createLink(url: string, expiresAt?: string | null): Promise<CreatedLink> {
    const body: Record<string, string> = { url };
    if (expiresAt) {
      body['expires_at'] = expiresAt;
    }
    return firstValueFrom(this.http.post<CreatedLink>(`${this.base}/api/links`, body));
  }

  deleteLink(code: string): Promise<unknown> {
    return firstValueFrom(this.http.delete(`${this.base}/api/me/links/${encodeURIComponent(code)}`));
  }

  publicStats(): Promise<PublicStats> {
    return firstValueFrom(this.http.get<PublicStats>(`${this.base}/api/stats`));
  }

  // ---- admin ----

  adminStats(): Promise<AdminStats> {
    return firstValueFrom(this.http.get<AdminStats>(`${this.base}/api/admin/stats`));
  }

  adminLinks(q = ''): Promise<{ data: AdminLink[] }> {
    const params = new HttpParams().set('q', q);
    return firstValueFrom(
      this.http.get<{ data: AdminLink[] }>(`${this.base}/api/admin/links`, { params }),
    );
  }

  setLinkStatus(code: string, status: 'active' | 'blocked'): Promise<unknown> {
    return firstValueFrom(
      this.http.post(`${this.base}/api/admin/links/${encodeURIComponent(code)}/status`, { status }),
    );
  }

  adminUsers(): Promise<{ data: AdminUser[] }> {
    return firstValueFrom(this.http.get<{ data: AdminUser[] }>(`${this.base}/api/admin/users`));
  }

  blockedHosts(): Promise<{ data: { host: string }[] }> {
    return firstValueFrom(
      this.http.get<{ data: { host: string }[] }>(`${this.base}/api/admin/hosts`),
    );
  }

  blockHost(host: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.base}/api/admin/hosts`, { host }));
  }

  unblockHost(host: string): Promise<unknown> {
    return firstValueFrom(
      this.http.delete(`${this.base}/api/admin/hosts/${encodeURIComponent(host)}`),
    );
  }
}
