import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  SavingsGoalResponseDto,
  CreateSavingsGoalRequestDto,
  UpdateSavingsGoalRequestDto,
  ContributeRequestDto
} from '../models/savings-goal.models';

type GoalApiResponse = { message: string; data: SavingsGoalResponseDto };

@Injectable({ providedIn: 'root' })
export class SavingsGoalService {

  private readonly base = `${environment.apiUrl}/api/goals`;

  constructor(private http: HttpClient) {}

  /** GET /api/goals?userId={userId} */
  getGoals(userId: number): Observable<SavingsGoalResponseDto[]> {
    return this.http
      .get<SavingsGoalResponseDto[]>(`${this.base}?userId=${userId}`)
      .pipe(catchError(this.handle));
  }

  /** GET /api/goals/{id} */
  getGoalById(goalId: number): Observable<SavingsGoalResponseDto> {
    return this.http
      .get<SavingsGoalResponseDto>(`${this.base}/${goalId}`)
      .pipe(catchError(this.handle));
  }

  /** POST /api/goals */
  createGoal(payload: CreateSavingsGoalRequestDto): Observable<GoalApiResponse> {
    return this.http
      .post<GoalApiResponse>(this.base, payload)
      .pipe(catchError(this.handle));
  }

  /** PUT /api/goals/{id} */
  updateGoal(goalId: number, payload: UpdateSavingsGoalRequestDto): Observable<GoalApiResponse> {
    return this.http
      .put<GoalApiResponse>(`${this.base}/${goalId}`, payload)
      .pipe(catchError(this.handle));
  }

  /** DELETE /api/goals/{id} */
  deleteGoal(goalId: number): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.base}/${goalId}`)
      .pipe(catchError(this.handle));
  }

  /** POST /api/goals/{id}/contribute */
  contribute(goalId: number, payload: ContributeRequestDto): Observable<GoalApiResponse> {
    return this.http
      .post<GoalApiResponse>(`${this.base}/${goalId}/contribute`, payload)
      .pipe(catchError(this.handle));
  }

  // ── Error handler ─────────────────────────────────────────────────────────
  private handle(err: HttpErrorResponse): Observable<never> {
    let msg = 'An unexpected error occurred. Please try again.';
    if (err.error?.message)                                msg = err.error.message;
    else if (typeof err.error === 'string' && err.error.trim()) msg = err.error;
    else if (err.status === 0)   msg = 'Cannot connect to server. Check your network.';
    else if (err.status === 401) msg = 'Session expired. Please log in again.';
    else if (err.status === 403) msg = 'You are not authorised to perform this action.';
    else if (err.status === 500) msg = 'Server error. Please try again later.';
    return throwError(() => new Error(msg));
  }
}
