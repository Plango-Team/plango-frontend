import { Component, computed, signal, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { AppointmentsStore } from '../../../appointments/appointments.store';
import { authStore } from '../../../../auth/auth.store';
import { MapStore } from '../../../map/map.store';
import { LocationComboboxComponent } from '../../../../../shared/components/location-combobox/location-combobox.component';
import { PlacesService, Place } from '../../../../../shared/services/places.service';
import { NotificationsStore } from '../../../../../shared/stores/notifications.store';
import { ToastService } from '../../../../../shared/services/toast.service';
import { AppointmentPayload } from '../../../appointments/interfaces/IAppointment';
import { UpdateAppointmentModalComponent } from '../../components/update-appointment-modal/update-appointment-modal.component';
import { DeletAppModalComponent } from "../../components/delet-app-modal/delet-app-modal.component";

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [CommonModule, IconComponent, FormsModule, LocationComboboxComponent, UpdateAppointmentModalComponent, DeletAppModalComponent],
  providers: [DatePipe],
  templateUrl: './calendar-page.component.html',
})
export class CalendarPageComponent {
  private appointmentsStore = inject(AppointmentsStore);
  private authStore = inject(authStore);
  private placesService = inject(PlacesService);
  private notificationsStore = inject(NotificationsStore);
  private toastService = inject(ToastService);
  mapStore = inject(MapStore);

  ar = true;
  slotHeight = 56;
  hours = Array.from({ length: 24 }, (_, i) => i);

  anchor = signal(new Date());
  drawerDay = signal<string | null>(null);

  @ViewChild('apptModal') apptModal!: ElementRef<HTMLDialogElement>;
  @ViewChild('drawerModal') drawerModal!: ElementRef<HTMLDialogElement>;

  Math = Math;

  appointments = computed(() => this.appointmentsStore.appointments());

  weekStart = 0;

  todayStr = computed(() => this.ymd(new Date()));
  newApptTitle = '';
  newApptDescription = '';
  newApptOrigin = 'Home';
  newApptOriginFullAddress = '';
  newApptDestination = '';
  newApptDesFullAddress = '';
  newApptOriginLat: number | null = null;
  newApptOriginLng: number | null = null;
  newApptDestLat: number | null = null;
  newApptDestLng: number | null = null;
  newApptDate = this.todayStr(); 
  newApptTime = '10:00';
  newApptTransport = 'car';
  newApptBufferMin = 15;
  newApptPrepMin = 20;
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

  openAddAppointment(defaultDate?: string) {
    this.resetApptForm();
    if (defaultDate) this.newApptDate = defaultDate;
    this.apptModal.nativeElement.showModal();
    void this.useCurrentLocationAsOrigin();
  }

  closeAddAppointment() {
    this.apptError.set(null);
    this.apptModal.nativeElement.close();
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
      this.newApptOrigin = this.ar ? 'موقعي الحالي' : 'Current location';
      this.newApptOriginFullAddress = this.newApptOrigin
      this.isResolvingCurrentLocation.set(false);
      this.apptError.set(
        this.mapStore.error() ||
          (this.ar
            ? 'اسمح للتطبيق بقراءة موقعك أو اختر نقطة الانطلاق يدويًا.'
            : 'Allow location access or choose an origin manually.'),
      );
      return;
    }

    this.newApptOrigin = this.ar ? 'موقعي الحالي' : 'Current location';
    this.newApptOriginLat = location.lat;
    this.newApptOriginLng = location.lng;

    try {
      const place = await firstValueFrom(
        this.placesService.reverseGeocode(location.lat, location.lng),
      );
      if (place) this.setPlaceAsOrigin(place);
      else{
        this.newApptOriginFullAddress = this.newApptOrigin
      }
    }catch (err){
      this.newApptOriginFullAddress = this.newApptOrigin
    } finally {
      this.isResolvingCurrentLocation.set(false);
    }
  }

  async submitAppointment() {
    if (this.isSubmittingAppointment()) return;

    const user = this.authStore.user();
    if (!user?._id) return;

    const title = this.newApptTitle.trim();
    const origin = this.newApptOrigin.trim();
    const destination = this.newApptDestination.trim();

    if (
      title.length < 2 ||
      origin.length < 2 ||
      destination.length < 2 ||
      !this.newApptDate ||
      !this.newApptTime
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
        this.newApptOriginLat,
        this.newApptOriginLng,
      );
      const destinationPlace = await this.resolveAppointmentPlace(
        destination,
        this.newApptDestLat,
        this.newApptDestLng,
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
        description:this.newApptDescription.trim() || '',
        transportation:this.newApptTransport,
        arrivalTime: new Date(`${this.newApptDate}T${this.newApptTime}`),
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
        arrivalBuffer:Number(this.newApptBufferMin),
        preparationTime : Number(this.newApptPrepMin),
        isRecurring:isRecurringSelected
      };

      if(isRecurringSelected){
        appt.repeatType = this.repeat;
        appt.repeatUntil = new Date(`${this.repeatUntil}`).toISOString()
      }
console.log(JSON.stringify(appt,null,2))
      this.appointmentsStore.addAppointment(appt);
      this.notificationsStore.push({
        kind: 'appointment_added',
        title: this.ar ? 'تمت إضافة موعد جديد' : 'Appointment added',
        body: `${title} · ${this.newApptDate} ${this.newApptTime}`,
        link: '/user/calendar',
      });
      this.toastService.success(
        this.ar ? 'تم إنشاء الموعد' : 'Appointment created',
        this.ar ? 'تم حفظ الموعد وإضافته إلى التقويم.' : 'Your appointment is now in calendar.',
      );
      this.closeAddAppointment();
    }catch(err){
      this.apptError.set(
        this.ar ? 'فشل انشاء الموعد، حاول مرة أخري' : 'Failed to create Appointment, Please try again')
    } finally {
      this.isSubmittingAppointment.set(false);
    }
  }

  get dayAppts() {
    const d = this.drawerDay();
    if (!d) return [];
    return this.appointments()
      .filter((appointment) =>{
        if(!appointment.arrivalTime) return false;
        const appDateStr = new Date(appointment.arrivalTime).toISOString().split('T')[0];
        return appDateStr === d
      }).sort((a, b) =>{
        return new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime()
      }
      )
  }

  get drawerTitleLabel() {
    const d = this.drawerDay();
    if (!d) return '';
    return new Date(d).toLocaleDateString(this.ar ? 'ar-EG' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  weekDays = computed(() => {
    const start = new Date(this.anchor());
    const day = start.getDay();
    const offset = (day - this.weekStart + 7) % 7;
    start.setDate(start.getDate() - offset);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  });

  weekdayNames = computed(() => {
    const fmt = new Intl.DateTimeFormat(this.ar ? 'ar-EG' : 'en-US', { weekday: 'short' });
    return this.weekDays().map((d) => fmt.format(d));
  });

  monthLabel = computed(() => {
    return this.anchor().toLocaleDateString(this.ar ? 'ar-EG' : 'en-US', {
      month: 'long',
      year: 'numeric',
    });
  });

  apptsByDay = computed(() => {
    const m = new Map<
      number,
      { start: number; dur: number; title: string; buffer: number; brand: boolean }[]
    >();
    const appts = this.appointments();
    const today = this.todayStr();

    this.weekDays().forEach((d, i) => {
      const ds = this.ymd(d);
      const items = appts
        .filter((appointment) =>{
          if(!appointment.arrivalTime) return false;
          const appDateStr = new Date(appointment.arrivalTime).toISOString().split('T')[0];
          return appDateStr === ds
        }).map((appointment) => {
          const dateObj = new Date(appointment.arrivalTime)
          const h = dateObj.getHours()
          const mn = dateObj.getMinutes()
          const start = (h || 0) + (mn || 0) / 60;
          const bufferHours = (appointment.arrivalBuffer || 0) / 60
          return {
            start,
            dur: 1,
            title: appointment.title,
            buffer: bufferHours,
            brand: ds === today,
          };
        })
        .filter((event) => event.start >= 0 && event.start < 24);
      m.set(i, items);
    });
    return m;
  });

  next7 = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appts = this.appointments();

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const ds = this.ymd(d);
      return {
        date: d,
        ds,
        count: appts.filter((appointment) =>{
          if(!appointment.arrivalTime) return false;
          const appDateStr = new Date(appointment.arrivalTime).toISOString().split('T')[0]
          return appDateStr === ds}).length,
      };
    });
  });

  ymd(d: Date): string {
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  getShortDayName(d: Date): string {
    return d.toLocaleDateString(this.ar ? 'ar-EG' : 'en-US', { weekday: 'short' });
  }

  prevWeek() {
    this.anchor.update((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7));
  }

  nextWeek() {
    this.anchor.update((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7));
  }

  goToToday() {
    this.anchor.set(new Date());
  }

  setDrawerDay(ds: string | null) {
    this.drawerDay.set(ds);
    if (ds) {
      setTimeout(() => this.drawerModal.nativeElement.showModal(), 0);
    } else {
      this.drawerModal.nativeElement.close();
    }
  }

  getApptsForDay(dayIdx: number) {
    return this.apptsByDay().get(dayIdx) ?? [];
  }

  get currentTimeOffset() {
    const now = new Date();
    return (now.getHours() + now.getMinutes() / 60) * this.slotHeight;
  }

  private resetApptForm() {
    this.newApptTitle = '';
    this.newApptOrigin = this.ar ? 'موقعي الحالي' : 'Current location';
    this.newApptDestination = '';
    this.newApptOriginLat = null;
    this.newApptOriginLng = null;
    this.newApptDestLat = null;
    this.newApptDestLng = null;
    this.newApptDate = this.todayStr();
    this.newApptTime = '10:00';
    this.newApptTransport = 'car';
    this.newApptBufferMin = 15;
    this.newApptPrepMin = 20;
    this.newApptDescription = '';
    this.apptError.set(null);
    this.isResolvingCurrentLocation.set(false);
  }

  private setPlaceAsOrigin(place: Place) {
    console.log(place)
    this.placesService.savePlace(place);
    this.newApptOrigin = place.name;
    this.newApptOriginLat = place.lat;
    this.newApptOriginLng = place.lng;
    this.newApptOriginFullAddress = (place as any).formattedAddress || place.name
  }

  private setPlaceAsDestination(place: Place) {
    console.log(place)
    this.placesService.savePlace(place);
    this.newApptDestination = place.name;
    this.newApptDestLat = place.lat;
    this.newApptDestLng = place.lng;
    this.newApptDesFullAddress = (place as any).formattedAddress || place.name
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

}
