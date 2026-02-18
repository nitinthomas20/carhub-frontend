import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

interface AuthCredentials {
  email: string;
  password: string;
}

interface AuthApiResponse {
  token?: string;
  accessToken?: string;
  data?: {
    token?: string;
    accessToken?: string;
  };
}

const AUTH_TOKEN_KEY = 'firehawkAuthToken';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = `${environment.apiBaseUrl}/v1/auth`;
  private readonly tokenState = signal<string | null>(this.readTokenFromStorage());

  readonly token = computed(() => this.tokenState());
  readonly isAuthenticated = computed(() => !!this.tokenState());

  register(credentials: AuthCredentials): Observable<void> {
    return this.http.post<AuthApiResponse>(`${this.apiBaseUrl}/register`, credentials).pipe(
      map((response) => this.extractToken(response)),
      tap((token) => this.setToken(token)),
      map(() => undefined),
    );
  }

  login(credentials: AuthCredentials): Observable<void> {
    return this.http.post<AuthApiResponse>(`${this.apiBaseUrl}/login`, credentials).pipe(
      map((response) => this.extractToken(response)),
      tap((token) => this.setToken(token)),
      map(() => undefined),
    );
  }

  logout(): void {
    this.tokenState.set(null);
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {
      // Ignore storage failures.
    }
  }

  getToken(): string | null {
    return this.tokenState();
  }

  private setToken(token: string): void {
    this.tokenState.set(token);
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } catch {
      // Ignore storage failures.
    }
  }

  private readTokenFromStorage(): string | null {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private extractToken(response: AuthApiResponse): string {
    const token = response.token ?? response.accessToken ?? response.data?.token ?? response.data?.accessToken;
    if (!token) {
      throw new Error('Authentication token was not returned by the API.');
    }
    return token;
  }
}
