import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  AdminCategoryDto,
  SaveCategoryRequestDto,
  AdminUserDto,
  AdminAccountCountDto
} from '../models/admin.models';

type CatResult = { message: string; data?: AdminCategoryDto };

@Injectable({ providedIn: 'root' })
export class AdminCategoryService {

  private readonly catBase  = `${environment.apiUrl}/api/categories`;
  private readonly userBase = `${environment.apiUrl}/api/users`;
  private readonly acctBase = `${environment.apiUrl}/api/accounts`;

  constructor(private http: HttpClient) {}

  // ── Categories ────────────────────────────────────────────────────────────

  /** GET /api/categories — all categories */
  getCategories(): Observable<AdminCategoryDto[]> {
    return this.http
      .get<AdminCategoryDto[]>(this.catBase)
      .pipe(catchError(this.handle));
  }

  /** POST /api/categories */
  createCategory(payload: SaveCategoryRequestDto): Observable<CatResult> {
    return this.http
      .post<CatResult>(this.catBase, payload)
      .pipe(catchError(this.handle));
  }

  /** PUT /api/categories/{id} */
  updateCategory(id: number, payload: SaveCategoryRequestDto): Observable<CatResult> {
    return this.http
      .put<CatResult>(`${this.catBase}/${id}`, payload)
      .pipe(catchError(this.handle));
  }

  /** DELETE /api/categories/{id} */
  deleteCategory(id: number): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.catBase}/${id}`)
      .pipe(catchError(this.handle));
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  /** GET /api/users — admin: get all users for dashboard count */
  getUsers(): Observable<AdminUserDto[]> {
    return this.http
      .get<AdminUserDto[]>(this.userBase)
      .pipe(catchError(this.handle));
  }

   // ── Accounts ──────────────────────────────────────────────────────────────

  /**
   * GET /api/accounts/admin/count — admin: total, active and inactive account counts.
   * Returns { message, totalAccounts, activeAccounts, inactiveAccounts }
   */
  getAccountCount(): Observable<AdminAccountCountDto> {
    return this.http
      .get<AdminAccountCountDto>(`${this.acctBase}/admin/count`)
      .pipe(catchError(this.handle));
  }


  // ── Error handler ─────────────────────────────────────────────────────────
  private handle(err: HttpErrorResponse): Observable<never> {
    let msg = 'An unexpected error occurred.';
    if (err.error?.message)       msg = err.error.message;
    else if (err.status === 0)    msg = 'Cannot connect to server.';
    else if (err.status === 401)  msg = 'Session expired. Please log in again.';
    else if (err.status === 403)  msg = 'You are not authorised to perform this action.';
    else if (err.status === 409)  msg = err.error?.message ?? 'A category with this name already exists.';
    else if (err.status === 500)  msg = 'Server error. Please try again later.';
    return throwError(() => new Error(msg));
  }
}
