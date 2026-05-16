import { Component, computed, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-outlet',
  standalone: true,
  imports: [],
  template: `
    <div class="pointer-events-none fixed inset-x-0 top-4 z-[120] px-4">
      <div class="mx-auto flex w-full max-w-xl flex-col gap-2 sm:max-w-sm" [class.ms-auto]="!isRtl()" [class.me-auto]="isRtl()">
        @for (toast of toastService.items(); track toast.id) {
          <div
            class="pointer-events-auto animate-fade-in rounded-xl border bg-ink-2 p-3 shadow-elevated"
            [class.border-success]="toast.tone === 'success'"
            [class.border-red-500]="toast.tone === 'error'"
            [class.border-brand]="toast.tone === 'warning'"
            [class.border-ink-border]="toast.tone === 'info'"
          >
            <div class="flex items-start gap-2.5">
              <span
                class="mt-1 h-2.5 w-2.5 rounded-full"
                [class.bg-success]="toast.tone === 'success'"
                [class.bg-red-500]="toast.tone === 'error'"
                [class.bg-brand]="toast.tone === 'warning'"
                [class.bg-ink-muted]="toast.tone === 'info'"
              ></span>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-semibold text-ink-fg">{{ toast.title }}</div>
                @if (toast.description) {
                  <div class="mt-0.5 text-xs text-ink-muted">{{ toast.description }}</div>
                }
              </div>
              <button
                type="button"
                (click)="toastService.dismiss(toast.id)"
                class="grid h-6 w-6 place-items-center rounded-md text-ink-muted transition-colors hover:bg-ink-3 hover:text-ink-fg"
                aria-label="Dismiss toast"
              >
                <span class="text-sm leading-none">×</span>
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class ToastOutletComponent {
  readonly toastService = inject(ToastService);
  readonly isRtl = computed(() => document?.documentElement?.dir === 'rtl');
}
