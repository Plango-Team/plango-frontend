import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { BackendNotification } from './notification-api.service';

@Injectable({
  providedIn: 'root',
})
export class NotificationRealtimeService {
  private readonly incoming = new Subject<BackendNotification>();
  private readonly createdPosts = new Subject<unknown>();
  private readonly likedPosts = new Subject<{
    postId: string;
    userId: string;
    liked: boolean;
  }>();
  private readonly deletedPosts = new Subject<{ postId: string; userId?: string }>();
  private socket: Socket | null = null;
  private activeToken: string | null = null;

  readonly connected = signal(false);
  readonly lastError = signal<string | null>(null);
  readonly notifications$ = this.incoming.asObservable();
  readonly postCreated$ = this.createdPosts.asObservable();
  readonly postLiked$ = this.likedPosts.asObservable();
  readonly postDeleted$ = this.deletedPosts.asObservable();

  connect(token: string): void {
    if (this.socket && this.activeToken === token) {
      if (!this.socket.connected) this.socket.connect();
      return;
    }

    this.disconnect();
    this.activeToken = token;

    const socketUrl = new URL(environment.apiUrl).origin;
    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
    });

    this.socket.on('connect', () => {
      this.connected.set(true);
      this.lastError.set(null);
    });
    this.socket.on('disconnect', () => this.connected.set(false));
    this.socket.on('connect_error', (error) => {
      this.connected.set(false);
      this.lastError.set(error.message);
    });
    this.socket.on('notification:new', (notification: BackendNotification) => {
      this.incoming.next(notification);
    });
    this.socket.on('postCreated', (post: unknown) => this.createdPosts.next(post));
    this.socket.on(
      'postLiked',
      (event: { postId: string; userId: string; liked: boolean }) =>
        this.likedPosts.next(event),
    );
    this.socket.on('postDeleted', (event: { postId: string; userId?: string }) =>
      this.deletedPosts.next(event),
    );
  }

  disconnect(): void {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.activeToken = null;
    this.connected.set(false);
  }
}
