import { TranslatePipe } from '@ngx-translate/core';
import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardComponent } from '../../../../../shared/ui/card/card.component';
import { EventModalComponent } from '../../components/event-modal/event-modal.component';
import { EventsStore } from '../../events.store';
import { EventCategory, IEvent } from '../../interfaces/Ievents';
import { LanguageService } from '../../../../../core/services/language.service';

@Component({
  selector: 'app-events-page',
  imports: [TranslatePipe, CardComponent, DatePipe, EventModalComponent, RouterLink],
  templateUrl: './events-page.component.html',
  styleUrl: './events-page.component.css',
})
export class EventsPageComponent {
  readonly store = inject(EventsStore);
  readonly language = inject(LanguageService);

  readonly categories = computed<{ id: 'all' | EventCategory; label: string }[]>(() => [
    { id: 'all', label: this.language.text('الكل', 'All') },
    { id: 'technology', label: this.language.text('تقنية', 'Technology') },
    { id: 'education', label: this.language.text('تعليم', 'Education') },
    { id: 'photography', label: this.language.text('تصوير', 'Photography') },
    { id: 'music', label: this.language.text('موسيقى', 'Music') },
    { id: 'sports', label: this.language.text('رياضة', 'Sports') },
    { id: 'art', label: this.language.text('فن', 'Art') },
    { id: 'other', label: this.language.text('أخرى', 'Other') },
  ]);

  categoryLabel(category: EventCategory): string {
    return this.categories().find((item) => item.id === category)?.label ?? category;
  }

  companyName(event: IEvent): string {
    return typeof event.companyId === 'string'
      ? this.language.text('مؤسسة PlanGo', 'PlanGo organization')
      : event.companyId.name;
  }

  locationLabel(event: IEvent): string {
    return (
      event.location?.addressName ||
      event.location?.fullAddress ||
      this.language.text('الموقع غير محدد', 'Location not specified')
    );
  }

  priceLabel(event: IEvent): string {
    const price = event.price ?? 0;
    return price > 0
      ? this.language.formatNumber(price, { style: 'currency', currency: 'EGP' })
      : this.language.text('مجاني', 'Free');
  }

  distanceLabel(event: IEvent): string | null {
    if (event.distance === null || event.distance === undefined) return null;
    return `${(event.distance / 1000).toFixed(1)} ${this.language.text('كم', 'km')}`;
  }

  hasStarted(event: IEvent): boolean {
    return new Date(event.startDate).getTime() <= Date.now();
  }

  hasEnded(event: IEvent): boolean {
    return new Date(event.endDate).getTime() < Date.now();
  }

  isScheduled(event: IEvent): boolean {
    return this.store.scheduledEventIds().includes(event._id);
  }

  canSchedule(event: IEvent): boolean {
    return !this.isScheduled(event) && !this.hasStarted(event) && event.title.length <= 32;
  }

  scheduleButtonLabel(event: IEvent): string {
    if (this.isScheduled(event)) return this.language.text('مضافة إلى جدولك', 'Added to your schedule');
    if (this.hasEnded(event)) return this.language.text('انتهت الفعالية', 'Event ended');
    if (this.hasStarted(event)) return this.language.text('بدأت الفعالية', 'Event started');
    if (event.title.length > 32) {
      return this.language.text('العنوان غير متوافق مع المواعيد', 'Title is too long for appointments');
    }
    return this.language.text('إضافة إلى الجدول', 'Add to schedule');
  }

  visibilityLabel(event: IEvent): string {
    return event.visibility === 'private'
      ? this.language.text('للمتابعين', 'Followers only')
      : this.language.text('عامة', 'Public');
  }

  visibilityClasses(event: IEvent): string {
    return event.visibility === 'private'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  }

  isLeaving(event: IEvent): boolean {
    return this.store.leavingEventId() === event._id;
  }
}
