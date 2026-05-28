import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  BudgetResponseDto,
  CategoryDto,
  CreateBudgetRequestDto,
  UpdateBudgetRequestDto
} from '../models/budget.models';

type BudgetApiResponse = { message: string; data: BudgetResponseDto };

@Injectable({ providedIn: 'root' })
export class BudgetService {

  private readonly budgetBase   = `${environment.apiUrl}/api/budgets`;
  private readonly categoryBase = `${environment.apiUrl}/api/categories`;

  constructor(private http: HttpClient) {}

  // ── Budgets ──────────────────────────────────────────────────────────────

  /** GET /api/budgets?userId={userId}&month={YYYY-MM} */
  getBudgetsByMonth(userId: number, month: string): Observable<BudgetResponseDto[]> {
    return this.http
      .get<BudgetResponseDto[]>(`${this.budgetBase}?userId=${userId}&month=${month}`)
      .pipe(catchError(this.handle));
  }

  /** GET /api/budgets/{id} */
  getBudgetById(budgetId: number): Observable<BudgetResponseDto> {
    return this.http
      .get<BudgetResponseDto>(`${this.budgetBase}/${budgetId}`)
      .pipe(catchError(this.handle));
  }

  /** POST /api/budgets */
  createBudget(payload: CreateBudgetRequestDto): Observable<BudgetApiResponse> {
    return this.http
      .post<BudgetApiResponse>(this.budgetBase, payload)
      .pipe(catchError(this.handle));
  }

  /** PUT /api/budgets/{id} */
  updateBudget(budgetId: number, payload: UpdateBudgetRequestDto): Observable<BudgetApiResponse> {
    return this.http
      .put<BudgetApiResponse>(`${this.budgetBase}/${budgetId}`, payload)
      .pipe(catchError(this.handle));
  }

  /** DELETE /api/budgets/{id} */
  deleteBudget(budgetId: number): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.budgetBase}/${budgetId}`)
      .pipe(catchError(this.handle));
  }

  // ── Categories ────────────────────────────────────────────────────────────

  /** GET /api/categories */
  getCategories(): Observable<CategoryDto[]> {
    return this.http
      .get<CategoryDto[]>(this.categoryBase)
      .pipe(catchError(this.handle));
  }

  // ── Error handler ─────────────────────────────────────────────────────────
  private handle(err: HttpErrorResponse): Observable<never> {
    let msg = 'An unexpected error occurred. Please try again.';
    if (err.error?.message)                                    msg = err.error.message;
    else if (typeof err.error === 'string' && err.error.trim()) msg = err.error;
    else if (err.status === 0)   msg = 'Cannot connect to server. Check your network.';
    else if (err.status === 401) msg = 'Session expired. Please log in again.';
    else if (err.status === 403) msg = 'You are not authorised to perform this action.';
    else if (err.status === 409) msg = err.error?.message || 'A budget for this category already exists.';
    else if (err.status === 500) msg = 'Server error. Please try again later.';
    return throwError(() => new Error(msg));
  }
}
