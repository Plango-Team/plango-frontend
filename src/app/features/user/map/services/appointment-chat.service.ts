import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../../../environments/environment';
import { LanguageService } from '../../../../core/services/language.service';

export interface AppointmentChatSender {
  _id: string;
  name: string;
  profileImage?: string;
}

export interface AppointmentChatMessage {
  _id: string;
  appointment: string | { _id: string };
  sender: string | AppointmentChatSender;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AppointmentChatService {
  private readonly http = inject(HttpClient);
  private readonly language = inject(LanguageService);
  private readonly baseUrl = `${environment.apiUrl}/messages`;
  private readonly incoming = new Subject<AppointmentChatMessage>();
  private readonly errors = new Subject<string>();
  private readonly joinedAppointmentIds = new Set<string>();

  private socket: Socket | null = null;
  private activeToken: string | null = null;

  readonly connected = signal(false);
  readonly lastError = signal<string | null>(null);
  readonly messages$ = this.incoming.asObservable();
  readonly errors$ = this.errors.asObservable();

  getMessages(appointmentId: string) {
    return this.http
      .get<{ success?: boolean; data: AppointmentChatMessage[] }>(`${this.baseUrl}/${appointmentId}`)
      .pipe(map((res) => res.data ?? []));
  }

  connect(token?: string | null): boolean {
    const activeToken = token?.trim() || null;

    if (this.socket && this.activeToken === activeToken) {
      if (!this.socket.connected) this.socket.connect();
      return true;
    }

    this.disconnect(false);
    this.activeToken = activeToken;

    const socketUrl = new URL(environment.apiUrl).origin;
    this.socket = io(socketUrl, {
      auth: activeToken ? { token: activeToken } : {},
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
    });

    this.socket.on('connect', () => {
      this.connected.set(true);
      this.lastError.set(null);
      this.joinedAppointmentIds.forEach((appointmentId) => {
        this.socket?.emit('joinAppointmentChat', { appointmentId });
      });
    });

    this.socket.on('disconnect', () => this.connected.set(false));
    this.socket.on('connect_error', (error) => {
      this.connected.set(false);
      this.handleError(
        error.message ||
          this.language.text(
            'تعذر الاتصال بمحادثة الموعد',
            'Could not connect to the appointment chat',
          ),
      );
    });
    this.socket.on('chatError', (error: { message?: string }) => {
      this.handleError(
        error.message ||
          this.language.text(
            'حدث خطأ في محادثة الموعد',
            'An appointment chat error occurred',
          ),
      );
    });
    this.socket.on('newMessage', (message: AppointmentChatMessage) => {
      this.incoming.next(message);
    });

    return true;
  }

  join(appointmentId: string, token?: string | null): void {
    if (!appointmentId || !this.connect(token)) return;

    this.joinedAppointmentIds.add(appointmentId);
    this.socket?.emit('joinAppointmentChat', { appointmentId });
  }

  sendMessage(appointmentId: string, content: string, token?: string | null): void {
    const message = content.trim();
    if (!appointmentId || !message) return;

    this.join(appointmentId, token);
    this.socket?.emit('sendMessage', {
      appointmentId,
      content: message,
    });
  }

  disconnect(clearRooms = true): void {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.activeToken = null;
    this.connected.set(false);

    if (clearRooms) {
      this.joinedAppointmentIds.clear();
    }
  }

  private handleError(message: string): void {
    this.lastError.set(message);
    this.errors.next(message);
  }
}
