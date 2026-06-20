import { DatePipe } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { LocationComboboxComponent } from '../../../../shared/components/location-combobox/location-combobox.component';
import { Place, PlacesService } from '../../../../shared/services/places.service';
import {
  EventCategory,
  EventVisibility,
} from '../../../user/events/interfaces/Ievents';
import { OrganizationEvent } from '../../services/organization-events.service';
import { OrganizationEventsStore } from '../../stores/organization-events.store';

type EventsFilter = 'upcoming' | 'ongoing' | 'past' | 'inactive' | 'all';

@Component({
  selector: 'app-organization-events-page',
  standalone: true,
  imports: [FormsModule, DatePipe, LocationComboboxComponent],
  templateUrl: './events-page.component.html',
})
export class OrganizationEventsPageComponent {
  @ViewChild('eventModal') eventModal!: ElementRef<HTMLDialogElement>;

  readonly store = inject(OrganizationEventsStore);
  private readonly placesService = inject(PlacesService);

  readonly filter = signal<EventsFilter>('upcoming');
  readonly visibilityFilter = signal<'all' | EventVisibility>('all');
  readonly query = signal('');
  readonly editingId = signal<string | null>(null);
  readonly formError = signal<string | null>(null);

  readonly categories: { id: EventCategory; label: string }[] = [
    { id: 'technology', label: 'تقنية' },
    { id: 'education', label: 'تعليم' },
    { id: 'music', label: 'موسيقى' },
    { id: 'sports', label: 'رياضة' },
    { id: 'photography', label: 'تصوير' },
    { id: 'art', label: 'فن' },
    { id: 'other', label: 'أخرى' },
  ];

  form = this.emptyForm();
  selectedPlace: Place | null = null;

  readonly filterTabs: Array<{ id: EventsFilter; label: string }> = [
    { id: 'upcoming', label: 'القادمة' },
    { id: 'ongoing', label: 'الجارية' },
    { id: 'past', label: 'السابقة' },
    { id: 'inactive', label: 'الموقوفة' },
    { id: 'all', label: 'الكل' },
  ];

  readonly filterCounts = computed(() => {
    const now = Date.now();
    const events = this.store.events();
    return {
      upcoming: events.filter(
        (event) => event.isActive && new Date(event.startDate).getTime() > now,
      ).length,
      ongoing: events.filter(
        (event) =>
          event.isActive &&
          new Date(event.startDate).getTime() <= now &&
          new Date(event.endDate).getTime() >= now,
      ).length,
      past: events.filter(
        (event) => event.isActive && new Date(event.endDate).getTime() < now,
      ).length,
      inactive: events.filter((event) => !event.isActive).length,
      all: events.length,
    };
  });

  readonly visibilityCounts = computed(() => ({
    all: this.store.events().length,
    public: this.store.events().filter((event) => event.visibility === 'public').length,
    private: this.store.events().filter((event) => event.visibility === 'private').length,
  }));

  readonly totalAttendees = computed(() =>
    this.store.events().reduce((total, event) => total + event.attendeesCount, 0),
  );

  readonly visibleEvents = computed(() => {
    const now = Date.now();
    const query = this.query().trim().toLowerCase();
    const filtered = this.store.events().filter((event) => {
      const start = new Date(event.startDate).getTime();
      const end = new Date(event.endDate).getTime();
      const matchesFilter =
        this.filter() === 'all' ||
        (this.filter() === 'inactive' && !event.isActive) ||
        (this.filter() === 'past' && event.isActive && end < now) ||
        (this.filter() === 'ongoing' && event.isActive && start <= now && end >= now) ||
        (this.filter() === 'upcoming' && event.isActive && start > now);
      const matchesVisibility =
        this.visibilityFilter() === 'all' ||
        event.visibility === this.visibilityFilter();

      if (!matchesFilter || !matchesVisibility || !query) {
        return matchesFilter && matchesVisibility;
      }
      return [
        event.title,
        event.description,
        event.location?.addressName,
        event.location?.fullAddress,
        this.categoryLabel(event.category),
      ].some((value) => value?.toLowerCase().includes(query));
    });

    return [...filtered].sort((a, b) => {
      const first = new Date(a.startDate).getTime();
      const second = new Date(b.startDate).getTime();
      return this.filter() === 'past' ? second - first : first - second;
    });
  });

  openCreateModal() {
    this.editingId.set(null);
    this.form = this.emptyForm();
    this.selectedPlace = null;
    this.formError.set(null);
    this.eventModal.nativeElement.showModal();
  }

  openEditModal(event: OrganizationEvent) {
    const location = event.location;
    this.editingId.set(event._id);
    this.form = {
      title: event.title,
      description: event.description,
      category: event.category,
      price: event.price ?? 0,
      startDate: this.toLocalDateTime(event.startDate),
      endDate: this.toLocalDateTime(event.endDate),
      locationName: location?.addressName || location?.fullAddress || '',
      imageUrl:
        event.images?.[0] && event.images[0] !== 'default-event.jpg'
          ? event.images[0]
          : '',
      visibility: event.visibility,
    };
    const coordinates = location?.coordinates;
    this.selectedPlace =
      coordinates?.length === 2 && Number.isFinite(coordinates[0]) && Number.isFinite(coordinates[1])
        ? {
            id: location?.placeId || `event_${event._id}`,
            name: this.form.locationName,
            area: location?.fullAddress,
            category: 'venue',
            lng: coordinates[0],
            lat: coordinates[1],
            createdAt: Date.now(),
          }
        : null;
    this.formError.set(null);
    this.eventModal.nativeElement.showModal();
  }

  closeModal() {
    this.eventModal.nativeElement.close();
  }

  onLocationNameChange(value: string) {
    this.form.locationName = value;
    if (this.selectedPlace?.name !== value) this.selectedPlace = null;
  }

  onPlaceSelected(place: Place) {
    this.selectedPlace = place;
    this.form.locationName = place.name;
  }

  async saveEvent() {
    this.formError.set(null);
    let place = this.selectedPlace;
    if (!place && this.form.locationName.trim()) {
      try {
        place = await firstValueFrom(
          this.placesService.resolvePlace(this.form.locationName.trim()),
        );
      } catch {
        place = null;
      }
    }

    const start = new Date(this.form.startDate);
    const end = new Date(this.form.endDate);
    if (
      this.form.title.trim().length < 3 ||
      this.form.title.trim().length > 32 ||
      !this.form.description.trim() ||
      !place ||
      !Number.isFinite(place.lat) ||
      !Number.isFinite(place.lng) ||
      (place.lat === 0 && place.lng === 0) ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      this.formError.set(
        'أكمل العنوان والوصف والموقع، وتأكد أن وقت النهاية بعد وقت البداية.',
      );
      return;
    }

    const input = {
      title: this.form.title.trim(),
      description: this.form.description.trim(),
      category: this.form.category,
      price: Math.max(0, Number(this.form.price) || 0),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      location: {
        addressName: place.name,
        fullAddress: place.area ? `${place.name}, ${place.area}` : place.name,
        type: 'Point' as const,
        coordinates: [place.lng, place.lat] as [number, number],
        placeId: place.id,
      },
      images: this.form.imageUrl.trim() ? [this.form.imageUrl.trim()] : undefined,
      visibility: this.form.visibility,
    };

    const id = this.editingId();
    const saved = id
      ? await this.store.updateEvent(id, input)
      : await this.store.createEvent(input);
    if (saved) this.closeModal();
  }

  async deleteEvent(event: OrganizationEvent) {
    if (!confirm(`حذف فعالية "${event.title}"؟ سيتم حذف المواعيد المرتبطة بها أيضاً.`)) {
      return;
    }
    await this.store.deleteEvent(event._id);
  }

  categoryLabel(category: EventCategory): string {
    return this.categories.find((item) => item.id === category)?.label ?? category;
  }

  locationLabel(event: OrganizationEvent): string {
    return event.location?.addressName || event.location?.fullAddress || 'الموقع غير محدد';
  }

  priceLabel(event: OrganizationEvent): string {
    const price = event.price ?? 0;
    return price ? `${price.toLocaleString('ar-EG')} ج.م` : 'مجاني';
  }

  eventStatus(event: OrganizationEvent): 'upcoming' | 'ongoing' | 'past' | 'inactive' {
    if (!event.isActive) return 'inactive';
    const now = Date.now();
    if (new Date(event.endDate).getTime() < now) return 'past';
    if (new Date(event.startDate).getTime() <= now) return 'ongoing';
    return 'upcoming';
  }

  statusLabel(event: OrganizationEvent): string {
    const labels = {
      upcoming: 'قادمة',
      ongoing: 'جارية الآن',
      past: 'انتهت',
      inactive: 'موقوفة',
    };
    return labels[this.eventStatus(event)];
  }

  statusClasses(event: OrganizationEvent): string {
    const status = this.eventStatus(event);
    if (status === 'ongoing') {
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    }
    if (status === 'upcoming') {
      return 'border-brand/30 bg-brand/10 text-brand';
    }
    if (status === 'inactive') {
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    }
    return 'border-ink-border bg-ink text-ink-muted';
  }

  eventImage(event: OrganizationEvent): string | null {
    const image = event.images?.find((item) => item && item !== 'default-event.jpg');
    return image ?? null;
  }

  visibilityLabel(event: OrganizationEvent): string {
    return event.visibility === 'private' ? 'خاصة بالمتابعين' : 'عامة';
  }

  visibilityClasses(event: OrganizationEvent): string {
    return event.visibility === 'private'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  }

  countFor(filter: EventsFilter): number {
    return this.filterCounts()[filter];
  }

  private emptyForm() {
    return {
      title: '',
      description: '',
      category: 'technology' as EventCategory,
      price: 0,
      startDate: '',
      endDate: '',
      locationName: '',
      imageUrl: '',
      visibility: 'public' as EventVisibility,
    };
  }

  private toLocalDateTime(value: string): string {
    const date = new Date(value);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  }
}
