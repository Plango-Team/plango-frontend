import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  createdAt: number;
};

type ToastPayload = {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly items = signal<ToastItem[]>([]);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  show(payload: ToastPayload): string {
    const id = Math.random().toString(36).slice(2, 10);
    const item: ToastItem = {
      id,
      title: payload.title,
      description: payload.description,
      tone: payload.tone ?? 'info',
      createdAt: Date.now(),
    };

    this.items.update((list) => [item, ...list].slice(0, 6));
    const duration = payload.durationMs ?? 4200;
    const timer = setTimeout(() => this.dismiss(id), duration);
    this.timers.set(id, timer);
    return id;
  }

  success(title: string, description?: string, durationMs?: number) {
    return this.show({ title, description, tone: 'success', durationMs });
  }

  error(title: string, description?: string, durationMs?: number) {
    return this.show({ title, description, tone: 'error', durationMs });
  }

  info(title: string, description?: string, durationMs?: number) {
    return this.show({ title, description, tone: 'info', durationMs });
  }

  warning(title: string, description?: string, durationMs?: number) {
    return this.show({ title, description, tone: 'warning', durationMs });
  }

  dismiss(id: string) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.items.update((list) => list.filter((item) => item.id !== id));
  }

  clear() {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.items.set([]);
  }
}
