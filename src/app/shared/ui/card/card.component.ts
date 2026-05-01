import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  host: {
    class: 'block h-full'
  },
  template: `
    <div [class]="'rounded-2xl border border-ink-border bg-ink-2 p-5 sm:p-6 shadow-soft transition-all hover:border-ink-fg/30 h-full ' + customClass">
      <ng-content></ng-content>
    </div>
  `
})
export class CardComponent {
  @Input() customClass: string = '';
}
