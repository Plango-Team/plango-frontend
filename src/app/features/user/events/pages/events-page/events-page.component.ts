import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardComponent } from '../../../../../shared/ui/card/card.component';
import { EventModalComponent } from '../../components/event-modal/event-modal.component';
import { EventsStore } from '../../events.store';
import { EventCategory, IEvent } from '../../interfaces/Ievents';

@Component({
  selector: 'app-events-page',
  imports: [CardComponent, DatePipe, EventModalComponent, RouterLink],
  templateUrl: './events-page.component.html',
  styleUrl: './events-page.component.css',
})
export class EventsPageComponent {
  readonly store = inject(EventsStore);

  readonly categories: { id: 'all' | EventCategory; label: string }[] = [
    { id: 'all', label: 'الكل' },
    { id: 'technology', label: 'تقنية' },
    { id: 'education', label: 'تعليم' },
    { id: 'photography', label: 'تصوير' },
    { id: 'music', label: 'موسيقى' },
    { id: 'sports', label: 'رياضة' },
    { id: 'art', label: 'فن' },
    { id: 'other', label: 'أخرى' },
  ];

  categoryLabel(category: EventCategory): string {
    return this.categories.find((item) => item.id === category)?.label ?? category;
  }

  companyName(event: IEvent): string {
    return typeof event.companyId === 'string' ? 'مؤسسة PlanGo' : event.companyId.name;
  }

  locationLabel(event: IEvent): string {
    return event.location?.addressName || event.location?.fullAddress || 'الموقع غير محدد';
  }

  priceLabel(event: IEvent): string {
    const price = event.price ?? 0;
    return price > 0 ? `${price.toLocaleString('ar-EG')} ج.م` : 'مجاني';
  }

  distanceLabel(event: IEvent): string | null {
    if (event.distance === null || event.distance === undefined) return null;
    return `${(event.distance / 1000).toFixed(1)} كم`;
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
    if (this.isScheduled(event)) return 'مضافة إلى جدولك';
    if (this.hasEnded(event)) return 'انتهت الفعالية';
    if (this.hasStarted(event)) return 'بدأت الفعالية';
    if (event.title.length > 32) return 'العنوان غير متوافق مع المواعيد';
    return 'إضافة إلى الجدول';
  }

  visibilityLabel(event: IEvent): string {
    return event.visibility === 'private' ? 'للمتابعين' : 'عامة';
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
