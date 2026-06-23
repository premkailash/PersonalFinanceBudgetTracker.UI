import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  CreateExportRequestDto,
  DataExportResponseDto,
  DataExportDownloadDto
} from '../models/data-export.models';

// ── API envelope types ────────────────────────────────────────────────────────
// The API wraps every response in { message, data } regardless of endpoint.
// data is a single object for create/poll and an ARRAY for the list endpoint.
type CreateResult   = { message: string; data: DataExportResponseDto  };
type ListResult     = { message: string; data: DataExportResponseDto[] };
type DownloadResult = { message: string; data: DataExportDownloadDto   };

@Injectable({ providedIn: 'root' })
export class DataExportService {

  private readonly base = `${environment.apiUrl}/api/export`;

  constructor(private http: HttpClient) {}

  // ── POST /api/export/ ─────────────────────────────────────────────────────
  createExport(payload: CreateExportRequestDto): Observable<CreateResult> {
    return this.http
      .post<CreateResult>(this.base, payload)
      .pipe(catchError(this.handle));
  }

  // ── GET /api/export/get ───────────────────────────────────────────────────
  // API returns: { "message": "...", "data": [ {...}, {...} ] }
  // We unwrap .data so the component receives DataExportResponseDto[] directly.
  getUserExports(): Observable<DataExportResponseDto[]> {
    return this.http
      .get<ListResult | DataExportResponseDto[]>(this.base)
      .pipe(
        map(response => {
          // Handle both shapes:
          //   Wrapped:   { message: string, data: DataExportResponseDto[] }
          //   Unwrapped: DataExportResponseDto[]   (plain array)
          if (Array.isArray(response)) {
            return response;
          }
          const envelope = response as ListResult;
          return Array.isArray(envelope.data) ? envelope.data : [];
        }),
        catchError(this.handle)
      );
  }

  // ── GET /api/export/{exportId} ────────────────────────────────────────────
  getExportDownload(exportId: number): Observable<DownloadResult> {
    return this.http
      .get<DownloadResult>(`${this.base}/${exportId}`)
      .pipe(catchError(this.handle));
  }

  // ── Error handler ─────────────────────────────────────────────────────────
  private handle(err: HttpErrorResponse): Observable<never> {
    let msg = 'An unexpected error occurred.';
    if (err.error?.message)       msg = err.error.message;
    else if (err.status === 0)    msg = 'Cannot connect to server.';
    else if (err.status === 401)  msg = 'Session expired. Please log in again.';
    else if (err.status === 403)  msg = 'You are not authorised to access this resource.';
    else if (err.status === 404)  msg = 'Export record not found.';
    return throwError(() => new Error(msg));
  }
}
