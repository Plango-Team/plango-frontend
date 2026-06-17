import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type BackendNotification = {
  _id: string;
  recipient: string | { _id: string };
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  channels?: string[];
  data?: Record<string, unknown>;
  scheduledFor?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export type NotificationPagination = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

type NotificationListResponse = {
  status: string;
  message: string;
  data: {
    notifications: BackendNotification[];
    pagination: NotificationPagination;
  };
};

type NotificationItemResponse = {
  status: string;
  message: string;
  data: BackendNotification;
};

@Injectable({
  providedIn: 'root',
})
export class NotificationApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  getNotifications(page = 1, limit = 20, unreadOnly = false): Observable<{
    notifications: BackendNotification[];
    pagination: NotificationPagination;
  }> {
    const params = new HttpParams()
      .set('page', page)
      .set('limit', limit)
      .set('unreadOnly', unreadOnly);

    return this.http
      .get<NotificationListResponse>(this.baseUrl, { params })
      .pipe(map((response) => response.data));
  }

  markAsRead(notificationId: string): Observable<BackendNotification> {
    return this.http
      .patch<NotificationItemResponse>(`${this.baseUrl}/${notificationId}/read`, {})
      .pipe(map((response) => response.data));
  }

  markAllAsRead(): Observable<void> {
    return this.http
      .patch(`${this.baseUrl}/read-all`, {})
      .pipe(map((): void => void 0));
  }

  saveFcmToken(fcmToken: string): Observable<void> {
    return this.http
      .post(`${this.baseUrl}/fcm-token`, { fcmToken })
      .pipe(map((): void => void 0));
  }
}
