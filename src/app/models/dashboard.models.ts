// ── Monthly Report ────────────────────────────────────────────────────────────
export interface MonthlyReportDto {
    accountId:    number;
    accountName:  string;
    month:        string;
    totalIncome:  number;
    totalExpense: number;
    netAmount:    number;
  }
  
  // ── Category Breakdown ───────────────────────────────────────────────────────
  export interface CategoryBreakdownDto {
    accountId:    number;
    accountName:  string;
    categoryId:   number;
    categoryName: string;
    type:         string;
    total:        number;
    count:        number;
  }
  
  // ── Notification ─────────────────────────────────────────────────────────────
  export interface NotificationDto {
    notificationId: number;
    userId:         number;
    message:        string;
    type:           string;
    isRead:         boolean;
    createdAt:      string;
  }
  
  // ── Dashboard Summary Card ────────────────────────────────────────────────────
  export interface SummaryCard {
    label:    string;
    value:    string;
    subtext?: string;
    trend?:   'up' | 'down' | 'neutral';
    icon:     string;
    color:    'gold' | 'green' | 'red' | 'blue';
  }
  