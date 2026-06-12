import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { NotificationDto } from '../models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class NotificationService {

  private readonly base = `${environment.apiUrl}/api/notifications`;

  // ── Shared reactive state ────────────────────────────────────────────────
  // Both the Dashboard header bell and the Notifications page subscribe to
  // this subject so the unread count badge is always in sync without a
  // separate API call.
  private readonly _unreadCount$ = new BehaviorSubject<number>(0);
  readonly unreadCount$ = this._unreadCount$.asObservable();

  constructor(private http: HttpClient) {}

  // ── GET /api/notifications ────────────────────────────────────────────────
  getNotifications(): Observable<NotificationDto[]> {
    return this.http.get<NotificationDto[]>(this.base).pipe(
      tap(data => {
        const list    = Array.isArray(data) ? data : [];
        const unread  = list.filter(n => !n.isRead).length;
        this._unreadCount$.next(unread);
      }),
      catchError(this.handle)
    );
  }

  // ── PUT /api/notifications/{id}/read ─────────────────────────────────────
  markAsRead(notificationId: number): Observable<{ message: string }> {
    return this.http
      .put<{ message: string }>(`${this.base}/${notificationId}/read`, {})
      .pipe(catchError(this.handle));
  }

  // ── DELETE /api/notifications/{id} ───────────────────────────────────────
  deleteNotification(notificationId: number): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.base}/${notificationId}`)
      .pipe(catchError(this.handle));
  }

  // ── Manually decrement unread (optimistic update) ─────────────────────────
  decrementUnread(): void {
    const current = this._unreadCount$.getValue();
    if (current > 0) this._unreadCount$.next(current - 1);
  }

  // ── Error handler ─────────────────────────────────────────────────────────
  private handle(err: HttpErrorResponse): Observable<never> {
    let msg = 'An unexpected error occurred.';
    if (err.error?.message)  msg = err.error.message;
    else if (err.status === 0)   msg = 'Cannot connect to server.';
    else if (err.status === 401) msg = 'Session expired. Please log in again.';
    else if (err.status === 404) msg = 'Notification not found.';
    return throwError(() => new Error(msg));
  }
}
