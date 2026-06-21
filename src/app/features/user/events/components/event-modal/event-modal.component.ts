import { TranslatePipe } from '@ngx-translate/core';
import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { LocationComboboxComponent } from '../../../../../shared/components/location-combobox/location-combobox.component';
import { Place, PlacesService } from '../../../../../shared/services/places.service';
import { EventsStore } from '../../events.store';
import {
  IEvent,
  TransportationMode,
} from '../../interfaces/Ievents';
import { LanguageService } from '../../../../../core/services/language.service';

@Component({
  selector: 'app-event-modal',
  imports: [TranslatePipe, FormsModule, LocationComboboxComponent],
  templateUrl: './event-modal.component.html',
  styleUrl: './event-modal.component.css',
})
export class EventModalComponent {
  readonly store = inject(EventsStore);
  private readonly placesService = inject(PlacesService);
  readonly language = inject(LanguageService);

  @ViewChild('eventModal') eventModal!: ElementRef<HTMLDialogElement>;

  readonly selectedEvent = signal<IEvent | null>(null);
  readonly error = signal<string | null>(null);
  readonly resolvingLocation = signal(false);

  originName = '';
  originPlace: Place | null = null;
  transportation: TransportationMode = 'driving';

  readonly transports = computed<{ id: TransportationMode; label: string }[]>(() => [
    { id: 'driving', label: this.language.text('سيارة', 'Car') },
    { id: 'walking', label: this.language.text('مشي', 'Walking') },
    { id: 'bicycling', label: this.language.text('دراجة', 'Bicycle') },
    { id: 'other', label: this.language.text('وسيلة أخرى', 'Other') },
  ]);

  open(event: IEvent) {
    this.selectedEvent.set(event);
    this.originName = '';
    this.originPlace = null;
    this.transportation = 'driving';
    this.error.set(
      new Date(event.startDate).getTime() <= Date.now()
        ? this.language.text(
            'لا يمكن إضافة فعالية بدأت بالفعل إلى جدول المواعيد.',
            'An event that has already started cannot be added to your schedule.',
          )
        : null,
    );
    this.eventModal.nativeElement.showModal();
  }

  close() {
    this.eventModal.nativeElement.close();
  }

  onOriginNameChange(value: string) {
    this.originName = value;
    if (this.originPlace?.name !== value) this.originPlace = null;
  }

  onPlaceSelected(place: Place) {
    this.originPlace = place;
    this.originName = place.name;
  }

  async useCurrentLocation() {
    if (!navigator.geolocation || this.resolvingLocation()) {
      this.error.set(
        this.language.text(
          'خدمة تحديد الموقع غير متاحة على هذا الجهاز.',
          'Location services are unavailable on this device.',
        ),
      );
      return;
    }

    this.resolvingLocation.set(true);
    this.error.set(null);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60_000,
        }),
      );
      const { latitude, longitude } = position.coords;
      const place = await firstValueFrom(
        this.placesService.reverseGeocode(latitude, longitude),
      );
      this.originPlace =
        place ??
        ({
          id: `current_${latitude}_${longitude}`,
          name: this.language.text('موقعي الحالي', 'My current location'),
          category: 'other',
          lat: latitude,
          lng: longitude,
          createdAt: Date.now(),
        } satisfies Place);
      this.originName = this.originPlace.name;
    } catch {
      this.error.set(
        this.language.text(
          'تعذر تحديد موقعك. اختر نقطة الانطلاق من البحث.',
          'Could not determine your location. Choose a starting point from search.',
        ),
      );
    } finally {
      this.resolvingLocation.set(false);
    }
  }

  selectedEventStarted(): boolean {
    const event = this.selectedEvent();
    return !!event && new Date(event.startDate).getTime() <= Date.now();
  }

  async onSubmit() {
    const event = this.selectedEvent();
    if (!event || this.store.joiningEventId()) return;
    this.error.set(null);

    if (new Date(event.startDate).getTime() <= Date.now()) {
      this.error.set(
        this.language.text(
          'لا يمكن إضافة فعالية بدأت بالفعل إلى جدول المواعيد.',
          'An event that has already started cannot be added to your schedule.',
        ),
      );
      return;
    }

    const place =
      this.originPlace ??
      (this.originName.trim()
        ? await firstValueFrom(this.placesService.resolvePlace(this.originName))
        : null);

    if (
      !place ||
      !Number.isFinite(place.lat) ||
      !Number.isFinite(place.lng) ||
      (place.lat === 0 && place.lng === 0)
    ) {
      this.error.set(
        this.language.text(
          'اختر نقطة انطلاق صحيحة من نتائج البحث.',
          'Choose a valid starting point from the search results.',
        ),
      );
      return;
    }

    const added = await this.store.addToSchedule(event._id, {
      startLocation: {
        addressName: place.name,
        fullAddress: place.area ? `${place.name}, ${place.area}` : place.name,
        type: 'Point',
        coordinates: [place.lng, place.lat],
        placeId: place.id,
      },
      transportation: this.transportation,
    });

    if (added) this.close();
  }
}
