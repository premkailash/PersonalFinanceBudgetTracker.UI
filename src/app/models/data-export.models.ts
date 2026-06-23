// ── Create request ────────────────────────────────────────────────────────────
export interface CreateExportRequestDto {
    userId:        number;
    accountId:     number;
    reportType:    'Transaction' | 'Budget';
    reportOptions: 'CSV' | 'PDF';
    fromDate:      string;   // ISO 8601
    toDate:        string;   // ISO 8601
  }
  
  // ── Export record returned from the API ───────────────────────────────────────
  export interface DataExportResponseDto {
    exportId:      number;
    reportType:    string;
    reportOptions: string;
    fromDate:      string;
    toDate:        string;
    userId:        number;
    accountId:     number;
    isGenerated:   boolean;
    reportLink:    string | null;
    timestamp:     string;   // UTC — used for sorting and "today" check
  }
  
  // ── Download / poll result ────────────────────────────────────────────────────
  export interface DataExportDownloadDto {
    exportId:    number;
    isGenerated: boolean;
    reportLink:  string | null;
  }
  
  // ── Form model ────────────────────────────────────────────────────────────────
  export interface ExportForm {
    accountId:     number | null;
    reportType:    string;
    reportOptions: string;
    fromDate:      string;
    toDate:        string;
  }
  