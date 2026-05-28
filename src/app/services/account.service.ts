import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  AccountResponseDto,
  CreateAccountRequestDto,
  UpdateAccountRequestDto
} from '../models/account.models';

@Injectable({ providedIn: 'root' })
export class AccountService {

  private readonly base = `${environment.apiUrl}/api/accounts`;

  constructor(private http: HttpClient) {}

  /** GET /api/accounts?userId={userId} */
  getAccounts(userId: number): Observable<AccountResponseDto[]> {
    return this.http
      .get<AccountResponseDto[]>(`${this.base}?userId=${userId}`)
      .pipe(catchError(this.handle));
  }

  /** GET /api/accounts/{id} */
  getAccountById(accountId: number): Observable<AccountResponseDto> {
    return this.http
      .get<AccountResponseDto>(`${this.base}/${accountId}`)
      .pipe(catchError(this.handle));
  }

  /** POST /api/accounts */
  createAccount(payload: CreateAccountRequestDto): Observable<{ message: string; data: AccountResponseDto }> {
    return this.http
      .post<{ message: string; data: AccountResponseDto }>(this.base, payload)
      .pipe(catchError(this.handle));
  }

  /** PUT /api/accounts/{id} */
  updateAccount(accountId: number, payload: UpdateAccountRequestDto): Observable<{ message: string; data: AccountResponseDto }> {
    return this.http
      .put<{ message: string; data: AccountResponseDto }>(`${this.base}/${accountId}`, payload)
      .pipe(catchError(this.handle));
  }

  /** DELETE /api/accounts/{id} */
  deleteAccount(accountId: number): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.base}/${accountId}`)
      .pipe(catchError(this.handle));
  }

  // ── Error handler ─────────────────────────────────────────────────────────
  private handle(err: HttpErrorResponse): Observable<never> {
    let msg = 'An unexpected error occurred. Please try again.';
    if (err.error?.message)              msg = err.error.message;
    else if (typeof err.error === 'string' && err.error.trim()) msg = err.error;
    else if (err.status === 0)           msg = 'Cannot connect to server. Please check your network.';
    else if (err.status === 401)         msg = 'Session expired. Please log in again.';
    else if (err.status === 403)         msg = 'You are not authorised to perform this action.';
    else if (err.status === 409)         msg = err.error?.message || 'Duplicate account.';
    else if (err.status === 500)         msg = 'Server error. Please try again later.';
    return throwError(() => new Error(msg));
  }
}
