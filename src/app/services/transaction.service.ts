import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  TransactionResponseDto,
  CreateTransactionRequestDto,
  UpdateTransactionRequestDto
} from '../models/transaction.models';

type TxApiResponse = { message: string; data: TransactionResponseDto };

@Injectable({ providedIn: 'root' })
export class TransactionService {

  private readonly base = `${environment.apiUrl}/api/transactions`;

  constructor(private http: HttpClient) {}

  /**
   * GET /api/transactions?account_id={id}&from={date}&to={date}
   * Date params in ISO 8601 format
   */
  getTransactions(
    accountId: number,
    from: string,
    to: string
  ): Observable<TransactionResponseDto[]> {
    const params = `account_id=${accountId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    return this.http
      .get<TransactionResponseDto[]>(`${this.base}?${params}`)
      .pipe(catchError(this.handle));
  }

  /** GET /api/transactions/{id} */
  getTransactionById(id: number): Observable<TransactionResponseDto> {
    return this.http
      .get<TransactionResponseDto>(`${this.base}/${id}`)
      .pipe(catchError(this.handle));
  }

  /** POST /api/transactions */
  createTransaction(payload: CreateTransactionRequestDto): Observable<TxApiResponse> {
    return this.http
      .post<TxApiResponse>(this.base, payload)
      .pipe(catchError(this.handle));
  }

  /** PUT /api/transactions/{id} */
  updateTransaction(id: number, payload: UpdateTransactionRequestDto): Observable<TxApiResponse> {
    return this.http
      .put<TxApiResponse>(`${this.base}/${id}`, payload)
      .pipe(catchError(this.handle));
  }

  /** DELETE /api/transactions/{id} */
  deleteTransaction(id: number): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.base}/${id}`)
      .pipe(catchError(this.handle));
  }

  private handle(err: HttpErrorResponse): Observable<never> {
    let msg = 'An unexpected error occurred. Please try again.';
    if (err.error?.message)                                    msg = err.error.message;
    else if (typeof err.error === 'string' && err.error.trim()) msg = err.error;
    else if (err.status === 0)   msg = 'Cannot connect to server.';
    else if (err.status === 401) msg = 'Session expired. Please log in again.';
    else if (err.status === 403) msg = 'You are not authorised to perform this action.';
    else if (err.status === 504) msg = 'Request timed out. Please try a smaller date range.';
    else if (err.status === 500) msg = 'Server error. Please try again later.';
    return throwError(() => new Error(msg));
  }
}
