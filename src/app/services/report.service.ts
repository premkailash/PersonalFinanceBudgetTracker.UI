import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { MonthlyReportDto, CategoryBreakdownDto, YearlyReportDto } from '../models/report.models';

@Injectable({ providedIn: 'root' })
export class ReportService {

  private readonly base = `${environment.apiUrl}/api/reports`;

  constructor(private http: HttpClient) {}

  /** GET /api/reports/monthly?month=YYYY-MM */
  getMonthlyReport(month: string): Observable<MonthlyReportDto[]> {
    return this.http
      .get<MonthlyReportDto[]>(`${this.base}/monthly?month=${month}`)
      .pipe(catchError(this.handle));
  }

  /** GET /api/reports/yearly?year=YYYY */
  getYearlyReport(year: string): Observable<YearlyReportDto[]> {
    return this.http
      .get<YearlyReportDto[]>(`${this.base}/yearly?year=${year}`)
      .pipe(catchError(this.handle));
  }

  /** GET /api/reports/category-breakdown?month=YYYY-MM */
  getCategoryBreakdown(month: string): Observable<CategoryBreakdownDto[]> {
    return this.http
      .get<CategoryBreakdownDto[]>(`${this.base}/category-breakdown?month=${month}`)
      .pipe(catchError(this.handle));
  }

  private handle(err: HttpErrorResponse): Observable<never> {
    let msg = 'An unexpected error occurred.';
    if (err.error?.message)  msg = err.error.message;
    else if (err.status === 0)   msg = 'Cannot connect to server.';
    else if (err.status === 401) msg = 'Session expired. Please log in again.';
    else if (err.status === 403) msg = 'You are not authorised to access reports.';
    return throwError(() => new Error(msg));
  }
}
