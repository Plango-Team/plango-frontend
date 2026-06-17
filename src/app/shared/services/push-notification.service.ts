import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  MessagePayload,
  Messaging,
  onMessage,
} from 'firebase/messaging';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export type PushPermissionState = NotificationPermission | 'unsupported';

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
  brave?: unknown;
};

@Injectable({
  providedIn: 'root',
})
export class PushNotificationService {
  private readonly router = inject(Router);
  private messagingPromise: Promise<Messaging | null> | null = null;
  private foregroundListenerReady = false;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private readonly incoming = new Subject<MessagePayload>();

  readonly supported = signal<boolean | null>(null);
  readonly permission = signal<PushPermissionState>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  readonly isBusy = signal(false);
  readonly lastError = signal<string | null>(null);
  readonly messages$ = this.incoming.asObservable();

  constructor() {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'PLANGO_NOTIFICATION_RECEIVED') {
          this.incoming.next(event.data.payload ?? {});
        }
      });
    }
    void this.getMessagingInstance();
  }

  async getRegistrationToken(requestPermission: boolean): Promise<string | null> {
    try {
      this.assertPushEnvironment();
      const messaging = await this.getMessagingInstance();
      if (!messaging) return null;

      let permission = Notification.permission;
      if (permission === 'default' && requestPermission) {
        this.isBusy.set(true);
        try {
          permission = await Notification.requestPermission();
        } finally {
          this.isBusy.set(false);
        }
      }

      this.permission.set(permission);
      if (permission !== 'granted') return null;

      const serviceWorkerRegistration = await this.ensureServiceWorker();
      this.lastError.set(null);

      try {
        return await this.requestFcmToken(messaging, serviceWorkerRegistration);
      } catch (error) {
        if (!this.isRecoverableSubscriptionError(error)) throw error;

        await this.resetPushSubscription(serviceWorkerRegistration);
        return await this.requestFcmToken(messaging, serviceWorkerRegistration);
      }
    } catch (error) {
      this.lastError.set(this.describeRegistrationError(error));
      throw error;
    }
  }

  async deleteCurrentToken(): Promise<void> {
    const messaging = await this.getMessagingInstance();
    if (!messaging || Notification.permission !== 'granted') return;

    try {
      await deleteToken(messaging);
    } catch {
      // Logout should continue even if the browser cannot revoke the token.
    }
  }

  private async getMessagingInstance(): Promise<Messaging | null> {
    if (this.messagingPromise) return this.messagingPromise;

    this.messagingPromise = (async () => {
      if (
        typeof window === 'undefined' ||
        typeof Notification === 'undefined' ||
        !('serviceWorker' in navigator)
      ) {
        this.supported.set(false);
        this.permission.set('unsupported');
        return null;
      }

      const messagingSupported = await isSupported();
      this.supported.set(messagingSupported);
      this.permission.set(messagingSupported ? Notification.permission : 'unsupported');
      if (!messagingSupported) return null;

      const firebaseApp = getApps().length ? getApp() : initializeApp(environment.firebase);
      const messaging = getMessaging(firebaseApp);
      this.listenForForegroundMessages(messaging);
      return messaging;
    })();

    return this.messagingPromise;
  }

  private listenForForegroundMessages(messaging: Messaging): void {
    if (this.foregroundListenerReady) return;
    this.foregroundListenerReady = true;

    onMessage(messaging, (payload) => {
      this.incoming.next(payload);
      void this.showForegroundNotification(payload);
    });
  }

  private async showForegroundNotification(payload: MessagePayload): Promise<void> {
    if (Notification.permission !== 'granted' || !payload.notification?.title) return;

    const registration = await this.ensureServiceWorker();
    await registration.showNotification(payload.notification.title, {
      body: payload.notification.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: payload.data?.['type'] ?? 'plango-notification',
      data: {
        ...payload.data,
        link: this.routeForType(payload.data?.['type']),
      },
    });
  }

  private async ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (this.serviceWorkerRegistration) return this.serviceWorkerRegistration;

    this.serviceWorkerRegistration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { scope: '/' },
    );
    await navigator.serviceWorker.ready;
    await this.serviceWorkerRegistration.update();
    return this.serviceWorkerRegistration;
  }

  private requestFcmToken(
    messaging: Messaging,
    serviceWorkerRegistration: ServiceWorkerRegistration,
  ): Promise<string> {
    return getToken(messaging, {
      vapidKey: environment.firebaseVapidKey,
      serviceWorkerRegistration,
    });
  }

  private async resetPushSubscription(
    serviceWorkerRegistration: ServiceWorkerRegistration,
  ): Promise<void> {
    const subscription = await serviceWorkerRegistration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
    await serviceWorkerRegistration.update();
  }

  private assertPushEnvironment(): void {
    if (!window.isSecureContext) {
      throw new Error('PUSH_REQUIRES_HTTPS');
    }

    if (this.isIos() && !this.isStandaloneDisplay()) {
      throw new Error('IOS_REQUIRES_HOME_SCREEN');
    }
  }

  private isRecoverableSubscriptionError(error: unknown): boolean {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    return (
      message.includes('push service error') ||
      message.includes('registration failed') ||
      message.includes('different applicationserverkey') ||
      message.includes('subscribe')
    );
  }

  private describeRegistrationError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);

    if (message === 'PUSH_REQUIRES_HTTPS') {
      return 'إشعارات الجهاز تحتاج إلى HTTPS على رابط الواجهة الأمامية.';
    }

    if (message === 'IOS_REQUIRES_HOME_SCREEN') {
      return 'على iPhone أو iPad: أضف PlanGo إلى الشاشة الرئيسية أولاً، ثم افتحه من الأيقونة وفعّل الإشعارات.';
    }

    const normalized = message.toLowerCase();
    if (
      normalized.includes('push service error') ||
      normalized.includes('registration failed')
    ) {
      const browserHint = this.isBrave()
        ? ' فعّل Google Services for Push Messaging من إعدادات Brave.'
        : '';
      return (
        'المتصفح لم يستطع الاتصال بخدمة Push. جرّب إيقاف VPN أو مانع الإعلانات، تأكد أن إشعارات الموقع مسموحة، ثم أعد فتح المتصفح.' +
        browserHint
      );
    }

    if (normalized.includes('failed-service-worker-registration')) {
      return 'تعذر تحميل firebase-messaging-sw.js من جذر موقع الواجهة الأمامية.';
    }

    if (normalized.includes('token-subscribe-failed')) {
      return 'فشل تسجيل FCM. تأكد أن FCM Registration API مفعّل وأن VAPID key مطابق لمشروع Firebase.';
    }

    return message || 'FCM registration failed';
  }

  private isIos(): boolean {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  private isStandaloneDisplay(): boolean {
    const navigatorWithStandalone = navigator as NavigatorWithStandalone;
    return (
      navigatorWithStandalone.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches
    );
  }

  private isBrave(): boolean {
    return Boolean((navigator as NavigatorWithStandalone).brave);
  }

  private routeForType(type?: string): string {
    switch (type) {
      case 'task_deadline':
        return '/user/tasks';
      case 'appointment_preparation':
      case 'appointment_departure':
        return '/user/calendar';
      case 'new_follower':
      case 'new_follow_request':
      case 'follow_request_accepted':
        return '/user/network';
      default:
        return '/user/notifications';
    }
  }
}
