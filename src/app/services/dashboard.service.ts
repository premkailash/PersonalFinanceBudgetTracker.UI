import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MonthlyReportDto, CategoryBreakdownDto, NotificationDto } from '../models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMonthlyReport(month: string): Observable<MonthlyReportDto[]> {
    return this.http.get<MonthlyReportDto[]>(
      `${this.api}/api/reports/monthly?month=${month}`
    );
  }

  getCategoryBreakdown(month: string): Observable<CategoryBreakdownDto[]> {
    return this.http.get<CategoryBreakdownDto[]>(
      `${this.api}/api/reports/category-breakdown?month=${month}`
    );
  }

  getNotifications(): Observable<NotificationDto[]> {
    return this.http.get<NotificationDto[]>(`${this.api}/api/notifications`);
  }
}
