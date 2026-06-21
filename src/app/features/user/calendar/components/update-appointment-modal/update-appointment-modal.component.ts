import { Component, computed, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { AppointmentsStore } from '../../../appointments/appointments.store';
import { authStore } from '../../../../auth/auth.store';
import { Place, PlacesService } from '../../../../../shared/services/places.service';
import { ToastService } from '../../../../../shared/services/toast.service';
import { NotificationsStore } from '../../../../../shared/stores/notifications.store';
import { MapStore } from '../../../map/map.store';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { LocationComboboxComponent } from '../../../../../shared/components/location-combobox/location-combobox.component';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { CommonModule } from '@angular/common';
import { Appointment } from '../../../appointments/interfaces/IAppointment';
import { LanguageService } from '../../../../../core/services/language.service';

@Component({
  selector: 'app-update-appointment-modal',
  imports: [CommonModule, IconComponent, FormsModule, LocationComboboxComponent],
  templateUrl: './update-appointment-modal.component.html',
  styleUrl: './update-appointment-modal.component.css',
})
export class UpdateAppointmentModalComponent {
private appointmentsStore = inject(AppointmentsStore);
  private authStore = inject(authStore);
  private placesService = inject(PlacesService);
  private notificationsStore = inject(NotificationsStore);
  private toastService = inject(ToastService);
  private language = inject(LanguageService);
  mapStore = inject(MapStore);

  get ar(): boolean {
    return this.language.isArabic();
  }

  @ViewChild('updateModal') updateModal!: ElementRef<HTMLDialogElement>;

  
  todayStr = computed(() => this.ymd(new Date()));

  
  currentAppId = '';
  updateApptTitle = '';
  updateApptDescription = '';
  updateApptOrigin = 'Home';
  updateApptOriginFullAddress = '';
  updateApptDestination = '';
  updateApptDesFullAddress = '';
  updateApptOriginLat: number | null = null;
  updateApptOriginLng: number | null = null;
  updateApptDestLat: number | null = null;
  updateApptDestLng: number | null = null;
  updateApptDate = this.todayStr();
  updateApptTime = '10:00';
  updateApptTransport = 'car';
  updateApptBufferMin = 15;
  updateApptPrepMin = 20;
  repeatUntil = this.todayStr();
  repeatArr = [{id:'بدون' , text: 'none'},{id: 'يومياً' , text:'daily'},{id: 'إسبوعياً' , text:'weekly'},{id:'شهرياً' , text : 'monthly'}]
  repeat : boolean | string = false;
  isResolvingCurrentLocation = signal(false);
  isSubmittingAppointment = signal(false);
  apptError = signal<string | null>(null);

  transports: { id: string; icon: string; ar: string; en: string }[] = [
      { id: 'driving', icon: 'Car01Icon', ar: 'سيارة', en: 'Driving' },
      { id: 'bicycling', icon: 'Bicycle01Icon', ar: 'دراجة', en: 'Bicycling' },
      { id: 'walking', icon: 'Route01Icon', ar: 'مشي', en: 'Walking' },
      { id: 'other', icon: 'Bus01Icon', ar: 'مواصلات', en: 'Other' },
    ];
  
    buffers = [0, 5, 10, 15, 30]; 
    prepOptions = [0, 10, 20, 30, 45, 60];

  openUpdateAppointment(appointment: Appointment | null | undefined) {
    if (!appointment?._id) return;

    this.currentAppId = appointment._id;
    this.populateForm(appointment);
    this.updateModal.nativeElement.showModal();
  }
    
  closeUpdateAppointment() {
    this.apptError.set(null);
    this.updateModal.nativeElement.close();
    this.currentAppId = '';
  }
    
      onOriginPlaceSelected(place: Place) {
        this.setPlaceAsOrigin(place);
      }
    
      onDestPlaceSelected(place: Place) {
        this.setPlaceAsDestination(place);
      }
    
      async useCurrentLocationAsOrigin() {
        this.apptError.set(null);
        this.isResolvingCurrentLocation.set(true);
        let location = this.mapStore.userLocation();
    
        if (!location) {
          this.mapStore.getCurrentLocation();
          location = await this.waitForUserLocation();
        }
    
        if (!location) {
          this.updateApptOrigin = this.ar ? 'موقعي الحالي' : 'Current location';
          this.updateApptOriginFullAddress = this.updateApptOrigin
          this.isResolvingCurrentLocation.set(false);
          this.apptError.set(
            this.mapStore.error() ||
              (this.ar
                ? 'اسمح للتطبيق بقراءة موقعك أو اختر نقطة الانطلاق يدويًا.'
                : 'Allow location access or choose an origin manually.'),
          );
          return;
        }
    
        this.updateApptOrigin = this.ar ? 'موقعي الحالي' : 'Current location';
        this.updateApptOriginLat = location.lat;
        this.updateApptOriginLng = location.lng;
    
        try {
          const place = await firstValueFrom(
            this.placesService.reverseGeocode(location.lat, location.lng),
          );
          if (place) this.setPlaceAsOrigin(place);
          else{
            this.updateApptOriginFullAddress = this.updateApptOrigin
          }
        }catch (err){
          this.updateApptOriginFullAddress = this.updateApptOrigin
        } finally {
          this.isResolvingCurrentLocation.set(false);
        }
      }

      async submitAppointment() {
    if (this.isSubmittingAppointment()) return;

    const user = this.authStore.user();
    if (!user?._id || !this.currentAppId) return;

    const title = this.updateApptTitle.trim();
    const origin = this.updateApptOrigin.trim();
    const destination = this.updateApptDestination.trim();

    if (
      title.length < 2 ||
      origin.length < 2 ||
      destination.length < 2 ||
      !this.updateApptDate ||
      !this.updateApptTime
    ) {
      this.apptError.set(
        this.ar
          ? 'يرجى تعبئة العنوان ونقطة الانطلاق والوجهة والتاريخ والوقت.'
          : 'Please complete title, origin, destination, date, and time.',
      );
      this.toastService.warning(
        this.ar ? 'تحقق من بيانات الموعد' : 'Check appointment details',
        this.ar ? 'أكمل العنوان ونقطة الانطلاق والوجهة والتاريخ والوقت.' : undefined,
      );
      return;
    }

    this.isSubmittingAppointment.set(true);
    this.apptError.set(null);

    try {
      const originPlace = await this.resolveAppointmentPlace(
        origin,
        this.updateApptOriginLat,
        this.updateApptOriginLng,
      );
      const destinationPlace = await this.resolveAppointmentPlace(
        destination,
        this.updateApptDestLat,
        this.updateApptDestLng,
      );

      if (!originPlace || !destinationPlace) {
        this.apptError.set(
          this.ar
            ? 'اختر نقطة الانطلاق والوجهة من نتائج البحث حتى نحفظ الإحداثيات بشكل صحيح.'
            : 'Choose both origin and destination from search results so coordinates are saved correctly.',
        );
        this.toastService.warning(
          this.ar ? 'اختر المواقع من البحث' : 'Pick locations from search',
        );
        return;
      }

      const isRecurringSelected = this.repeat !== 'none' && this.repeat !== false

      const appt : any = {
        title:title,
        description:this.updateApptDescription.trim() || '',
        transportation:this.updateApptTransport,
        arrivalTime: new Date(`${this.updateApptDate}T${this.updateApptTime}`),
        startLocation: {
          addressName: originPlace.name,
          type: 'Point',
          coordinates: [Number(originPlace.lng), Number(originPlace.lat)] as [number , number]
        },
        destinationLocation: {
          addressName: destinationPlace.name,
          type: 'Point',
          coordinates: [Number(destinationPlace.lng), Number(destinationPlace.lat)] as [number , number]
        },
        arrivalBuffer:Number(this.updateApptBufferMin),
        preparationTime : Number(this.updateApptPrepMin),
        isRecurring:isRecurringSelected
      };

      if(isRecurringSelected){
        appt.repeatType = this.repeat;
        appt.repeatUntil = new Date(`${this.repeatUntil}`).toISOString()
      }
console.log(JSON.stringify(appt,null,2))
      this.appointmentsStore.updateAppointment({id: this.currentAppId , payload : appt});
      this.notificationsStore.push({
        kind: 'appointment_added',
        title: this.ar ? 'تم تحديث الموعد' : 'Appointment updated',
        body: `${title} · ${this.updateApptDate} ${this.updateApptTime}`,
        link: '/user/calendar',
      });
      this.toastService.success(
        this.ar ? 'تم تحديث الموعد' : 'Appointment updated',
        this.ar ? 'تم حفظ الموعد وإضافته إلى التقويم.' : 'Your appointment is now in calendar.',
      );
      this.closeUpdateAppointment();
    }catch(err){
      this.apptError.set(
        this.ar ? 'فشل انشاء الموعد، حاول مرة أخري' : 'Failed to create Appointment, Please try again')
    } finally {
      this.isSubmittingAppointment.set(false);
    }
  }

  private setPlaceAsOrigin(place: Place) {
      console.log(place)
      this.placesService.savePlace(place);
      this.updateApptOrigin = place.name;
      this.updateApptOriginLat = place.lat;
      this.updateApptOriginLng = place.lng;
      this.updateApptOriginFullAddress = (place as any).formattedAddress || place.name
    }
  
    private setPlaceAsDestination(place: Place) {
      console.log(place)
      this.placesService.savePlace(place);
      this.updateApptDestination = place.name;
      this.updateApptDestLat = place.lat;
      this.updateApptDestLng = place.lng;
      this.updateApptDesFullAddress = (place as any).formattedAddress || place.name
    }
  
    private async resolveAppointmentPlace(
      name: string,
      lat: number | null,
      lng: number | null,
    ): Promise<Place | null> {
      if (this.hasUsableCoordinates(lat, lng)) {
        const place: Place = {
          id: `selected_${lat.toFixed(5)}_${lng.toFixed(5)}`,
          name,
          category: 'other',
          lat,
          lng,
          createdAt: Date.now(),
        };
        this.placesService.savePlace(place);
        return place;
      }
  
      const saved = this.placesService.findByName(name);
      if (saved && this.hasUsableCoordinates(saved.lat, saved.lng)) return saved;
  
      return firstValueFrom(this.placesService.resolvePlace(name));
    }
  
    private async waitForUserLocation(timeoutMs = 5000) {
      const startedAt = Date.now();
  
      while (Date.now() - startedAt < timeoutMs) {
        const location = this.mapStore.userLocation();
        if (location) return location;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
  
      return this.mapStore.userLocation();
    }
  
    private hasUsableCoordinates(lat: number | null, lng: number | null): lat is number {
      return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
    }

  private populateForm(appointment: Appointment) {
    const arrival = appointment.arrivalTime
      ? new Date(appointment.arrivalTime)
      : new Date();
    const origin = appointment.startLocation;
    const destination = appointment.destinationLocation;

    this.updateApptTitle = appointment.title?.trim() || '';
    this.updateApptDescription = appointment.description?.trim() || '';
    this.updateApptOrigin =
      origin?.addressName || origin?.fullAddress || origin?.fullAddres || '';
    this.updateApptOriginFullAddress =
      origin?.fullAddress || origin?.fullAddres || origin?.addressName || '';
    this.updateApptDestination =
      destination?.addressName ||
      destination?.fullAddress ||
      destination?.fullAddres ||
      '';
    this.updateApptDesFullAddress =
      destination?.fullAddress ||
      destination?.fullAddres ||
      destination?.addressName ||
      '';
    this.updateApptOriginLng = origin?.coordinates?.[0] ?? null;
    this.updateApptOriginLat = origin?.coordinates?.[1] ?? null;
    this.updateApptDestLng = destination?.coordinates?.[0] ?? null;
    this.updateApptDestLat = destination?.coordinates?.[1] ?? null;
    this.updateApptDate = this.ymd(arrival);
    this.updateApptTime = `${String(arrival.getHours()).padStart(2, '0')}:${String(
      arrival.getMinutes(),
    ).padStart(2, '0')}`;
    this.updateApptTransport = this.normalizeTransportation(appointment.transportation);
    this.updateApptBufferMin = Number(appointment.arrivalBuffer ?? 0);
    this.updateApptPrepMin = Number(appointment.preparationTime ?? 0);
    this.repeat = appointment.isRecurring
      ? appointment.repeatType || 'weekly'
      : 'none';
    this.repeatUntil = appointment.repeatUntil
      ? this.ymd(new Date(appointment.repeatUntil))
      : this.updateApptDate;
    this.apptError.set(null);
  }

  private normalizeTransportation(value: string | null | undefined): string {
    const modes: Record<string, string> = {
      car: 'driving',
      drive: 'driving',
      driving: 'driving',
      walk: 'walking',
      walking: 'walking',
      bicycle: 'bicycling',
      bicycling: 'bicycling',
      publicTransport: 'other',
      other: 'other',
    };
    return modes[value ?? ''] ?? 'driving';
  }

  private resetApptForm() {
    this.updateApptTitle = '';
    this.updateApptOrigin = this.ar ? 'موقعي الحالي' : 'Current location';
    this.updateApptDestination = '';
    this.updateApptOriginLat = null;
    this.updateApptOriginLng = null;
    this.updateApptDestLat = null;
    this.updateApptDestLng = null;
    this.updateApptDate = this.todayStr();
    this.updateApptTime = '10:00';
    this.updateApptTransport = 'car';
    this.updateApptBufferMin = 15;
    this.updateApptPrepMin = 20;
    this.updateApptDescription = '';
    this.apptError.set(null);
    this.isResolvingCurrentLocation.set(false);
  }

  ymd(d: Date): string {
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }
}
