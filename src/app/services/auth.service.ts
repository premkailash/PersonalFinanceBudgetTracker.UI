import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  RegisterRequestDto,
  LoginRequestDto,
  RegisterResponse,
  LoginResponse,
  AuthSession
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly baseUrl = `${environment.apiUrl}/api/auth`;

  // LocalStorage keys
  private readonly TOKEN_KEY  = 'fa_token';
  private readonly USERID_KEY = 'fa_userId';
  private readonly ROLE_KEY   = 'fa_role';
  private readonly USERNAME_KEY = 'fa_userName';

  constructor(private http: HttpClient) {}

  // ── API calls ─────────────────────────────────────────────────────────────

  register(payload: RegisterRequestDto): Observable<RegisterResponse> {
    return this.http
      .post<RegisterResponse>(`${this.baseUrl}/register`, payload)
      .pipe(catchError(this.handleError));
  }

  login(payload: LoginRequestDto): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/login`, payload)
      .pipe(catchError(this.handleError));
  }

  logout(): Observable<{ message: string }> {
    const userId = this.getUserId();
    return this.http
      .post<{ message: string }>(`${this.baseUrl}/logout`, { userId })
      .pipe(catchError(this.handleError));
  }

  // ── Session management ────────────────────────────────────────────────────

  saveSession(response: LoginResponse): void {
    localStorage.setItem(this.TOKEN_KEY,  response.token);
    localStorage.setItem(this.USERID_KEY, String(response.userId));
    localStorage.setItem(this.ROLE_KEY,   response.role);
    localStorage.setItem(this.USERNAME_KEY,response.userName);
  }

  clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USERID_KEY);
    localStorage.removeItem(this.ROLE_KEY);
    localStorage.removeItem(this.USERNAME_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUserId(): number | null {
    const v = localStorage.getItem(this.USERID_KEY);
    return v ? Number(v) : null;
  }

  getRole(): string | null {
    return localStorage.getItem(this.ROLE_KEY);
  }

  getUserName(): string | null {
    return localStorage.getItem(this.USERNAME_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getSession(): AuthSession | null {
    const token  = this.getToken();
    const userId = this.getUserId();
    const role   = this.getRole();
    const userName = this.getUserName();
    if (!token || !userId || !role || !userName) return null;
    return { token, userId, role,userName };
  }

  // ── Error handler ─────────────────────────────────────────────────────────

  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'An unexpected error occurred. Please try again.';

    if (error.error && typeof error.error === 'object' && error.error.message) {
      message = error.error.message;
    } else if (typeof error.error === 'string' && error.error.trim()) {
      message = error.error;
    } else if (error.status === 0) {
      message = 'Cannot connect to server. Please check your network.';
    } else if (error.status === 500) {
      message = 'Server error. Please try again later.';
    }

    return throwError(() => new Error(message));
  }
}
