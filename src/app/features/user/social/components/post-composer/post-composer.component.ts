import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocialStore } from '../../social.store';
import { authStore } from '../../../../auth/auth.store';
import { LanguageService } from '../../../../../core/services/language.service';

@Component({
  selector: 'app-post-composer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  host: { class: 'block' },
  template: `
    <form (ngSubmit)="onSubmit()" class="rounded-2xl border border-ink-border bg-ink-2 p-3">
      <textarea
        [(ngModel)]="body"
        name="body"
        [placeholder]="placeholderText"
        maxlength="500"
        rows="2"
        class="w-full resize-none border-0 bg-transparent p-0 text-sm text-ink-fg focus:outline-none focus:ring-0 placeholder:text-ink-muted"
      ></textarea>
      <div class="mt-2 flex items-center justify-between gap-3">
        <span
          class="text-[11px] tabular-nums"
          [class.text-red-400]="body.length > 480"
          [class.text-ink-muted]="body.length <= 480"
        >
          {{ body.length }}/500
        </span>
        <button
          type="submit"
          [disabled]="!body.trim() || body.trim().length > 500"
          class="rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ language.text('نشر', 'Post') }}
        </button>
      </div>
    </form>
  `,
})
export class PostComposerComponent {
  socialStore = inject(SocialStore);
  authStore = inject(authStore);
  readonly language = inject(LanguageService);

  placeholder = input<string>();

  body = '';

  get placeholderText(): string {
    if (this.placeholder()) return this.placeholder()!;
    const kind = this.socialStore.myProfile()?.kind;
    return kind === 'org'
      ? this.language.text(
          'شارك تحديثاً مع متابعيك...',
          'Share an update with your followers...'
        )
      : this.language.text('بم تفكّر؟', 'What are you thinking?');
  }

  onSubmit() {
    const user = this.authStore.user();
    if (!user || !this.body.trim() || this.body.trim().length > 500) return;
    this.socialStore.createPost(this.socialStore.myProfile()?.id ?? user._id, this.body);
    this.body = '';
  }
}
