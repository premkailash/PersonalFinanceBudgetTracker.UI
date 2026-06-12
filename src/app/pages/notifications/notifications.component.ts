import { Component, OnInit, Input } from '@angular/core';
import { CommonModule }              from '@angular/common';
import { NotificationService }       from '../../services/notification.service';
import { NotificationDto }           from '../../models/dashboard.models';

@Component({
  selector:    'app-notifications',
  standalone:  true,
  imports:     [CommonModule],
  templateUrl: './notifications.component.html'
})
export class NotificationsComponent implements OnInit {
  @Input() userId = 0;

  // ── Data ──────────────────────────────────────────────────────────────────
  notifications:  NotificationDto[] = [];
  isLoading       = false;
  listError       = '';

  // ── Unread count (reactive — stays in sync with Dashboard bell) ───────────
  unreadCount     = 0;

  // ── Action state ──────────────────────────────────────────────────────────
  actioningId:    number | null = null;   // spinner on the row being actioned
  actionError     = '';
  actionSuccess   = '';

  // ── Delete confirm ────────────────────────────────────────────────────────
  deleteTarget:   NotificationDto | null = null;
  isDeleting      = false;
  deleteError     = '';

  constructor(private svc: NotificationService) {}

  ngOnInit(): void {
    // Subscribe to shared unread count so it stays in sync with Dashboard
    this.svc.unreadCount$.subscribe(count => {
      this.unreadCount = count;
    });

    this.loadNotifications();
  }

  // ── Load list ─────────────────────────────────────────────────────────────

  loadNotifications(): void {
    this.isLoading  = true;
    this.listError  = '';
    this.actionSuccess = '';
    this.actionError   = '';

    this.svc.getNotifications().subscribe({
      next: (data) => {
        this.notifications = Array.isArray(data)
          ? data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          : [];
        this.isLoading = false;
      },
      error: (err: Error) => {
        this.listError = err.message;
        this.isLoading = false;
      }
    });
  }

  // ── Mark as Read ──────────────────────────────────────────────────────────

  onMarkAsRead(n: NotificationDto): void {
    if (n.isRead) return;                 // already read — no-op

    this.actioningId  = n.notificationId;
    this.actionError  = '';
    this.actionSuccess = '';

    this.svc.markAsRead(n.notificationId).subscribe({
      next: () => {
        this.actioningId   = null;
        this.actionSuccess = 'Notification marked as read.';

        // Optimistic local update — no full reload needed
        const idx = this.notifications.findIndex(x => x.notificationId === n.notificationId);
        if (idx !== -1) this.notifications[idx] = { ...this.notifications[idx], isRead: true };

        // Sync the shared unread badge
        this.svc.decrementUnread();

        setTimeout(() => { this.actionSuccess = ''; }, 3000);
      },
      error: (err: Error) => {
        this.actioningId = null;
        this.actionError = err.message;
        // Full refresh to recover correct state
        this.loadNotifications();
      }
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  openDeleteConfirm(n: NotificationDto): void {
    this.deleteTarget = n;
    this.deleteError  = '';
    this.isDeleting   = false;
  }

  cancelDelete(): void {
    this.deleteTarget = null;
    this.deleteError  = '';
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.isDeleting = true;
    this.deleteError = '';

    const id      = this.deleteTarget.notificationId;
    const wasUnread = !this.deleteTarget.isRead;

    this.svc.deleteNotification(id).subscribe({
      next: () => {
        this.isDeleting  = false;
        this.deleteTarget = null;
        this.actionSuccess = 'Notification deleted.';

        // Remove locally — no need to re-fetch whole list
        this.notifications = this.notifications.filter(n => n.notificationId !== id);

        // Sync shared unread badge if the deleted notification was unread
        if (wasUnread) this.svc.decrementUnread();

        setTimeout(() => { this.actionSuccess = ''; }, 3000);
      },
      error: (err: Error) => {
        this.isDeleting  = false;
        this.deleteError = err.message;
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  typeIcon(type: string): string {
    const map: Record<string, string> = {
      BudgetAlert80:  '⚠️',
      BudgetAlert100: '🚨',
      GoalAlert50:    '🎯',
      GoalAlert100:   '🏆',
      Transaction:    '💳',
      Account:        '🏦',
      System:         '🔧',
      Reminder:       '⏰'
    };
    return map[type] ?? '🔔';
  }

  typeBadgeClass(type: string): string {
    if (type.startsWith('BudgetAlert100') || type.startsWith('GoalAlert100'))
      return 'notif-badge-danger';
    if (type.startsWith('BudgetAlert80') || type.startsWith('GoalAlert50'))
      return 'notif-badge-warning';
    if (type === 'Transaction' || type === 'Account')
      return 'notif-badge-info';
    return 'notif-badge-default';
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  get unreadNotifications(): NotificationDto[] {
    return this.notifications.filter(n => !n.isRead);
  }

  get readNotifications(): NotificationDto[] {
    return this.notifications.filter(n => n.isRead);
  }
}
