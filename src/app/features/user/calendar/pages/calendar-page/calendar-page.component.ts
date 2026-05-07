import { Component, computed, signal, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { Appointment } from '../../services/appointment.service';
import { AppointmentsStore } from '../../../appointments/appointments.store';
import { FormsModule } from '@angular/forms';
import { authStore } from '../../../../auth/auth.store';

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [CommonModule, IconComponent, FormsModule],
  providers: [DatePipe],
  templateUrl: './calendar-page.component.html',
})
export class CalendarPageComponent {
  private appointmentsStore = inject(AppointmentsStore);
  private authStore = inject(authStore);

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

  // Add Appointment Form State
  newApptTitle = '';
  newApptDestination = '';
  newApptDate = this.todayStr();
  newApptTime = '10:00';
  newApptTransport = 'car';
  newApptBufferMin = 15;
  newApptNotes = '';

  transports = [
    { id: 'car', icon: 'CarIcon', ar: 'سيارة', en: 'Car' },
    { id: 'scooter', icon: 'BikeIcon', ar: 'سكوتر', en: 'Scooter' },
    { id: 'walk', icon: 'WalkIcon', ar: 'مشي', en: 'Walk' },
    { id: 'transit', icon: 'BusIcon', ar: 'مواصلات', en: 'Transit' },
  ];

  buffers = [0, 5, 10, 15, 30];

  openAddAppointment(defaultDate?: string) {
    if (defaultDate) this.newApptDate = defaultDate;
    this.apptModal.nativeElement.showModal();
  }

  closeAddAppointment() {
    this.apptModal.nativeElement.close();
  }

  submitAppointment() {
    const user = this.authStore.user();
    if (!user?.id) return;
    
    if (!this.newApptTitle || !this.newApptDate || !this.newApptTime) {
      alert(this.ar ? 'يرجى تعبئة الحقول الأساسية' : 'Please fill required fields');
      return;
    }

    const appt: Appointment = {
      userId: user.id,
      title: this.newApptTitle,
      destination: this.newApptDestination,
      date: this.newApptDate,
      time: this.newApptTime,
      transport: this.newApptTransport,
      bufferMin: this.newApptBufferMin,
      notes: this.newApptNotes
    };

    this.appointmentsStore.addAppointment(appt);
    this.closeAddAppointment();
    // Reset form
    this.newApptTitle = '';
    this.newApptDestination = '';
  }

  // Drawer helpers
  get dayAppts() {
    const d = this.drawerDay();
    if (!d) return [];
    return this.appointments()
      .filter(a => a.date === d)
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  get drawerTitleLabel() {
    const d = this.drawerDay();
    if (!d) return '';
    return new Date(d).toLocaleDateString(this.ar ? "ar-EG" : "en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  // Calendar core
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
    const fmt = new Intl.DateTimeFormat(this.ar ? "ar-EG" : "en-US", { weekday: "short" });
    return this.weekDays().map((d) => fmt.format(d));
  });

  monthLabel = computed(() => {
    return this.anchor().toLocaleDateString(this.ar ? "ar-EG" : "en-US", {
      month: "long",
      year: "numeric",
    });
  });

  apptsByDay = computed(() => {
    const m = new Map<number, { start: number; dur: number; title: string; buffer: number; brand: boolean }[]>();
    const appts = this.appointments();
    const today = this.todayStr();

    this.weekDays().forEach((d, i) => {
      const ds = this.ymd(d);
      const items = appts
        .filter((a) => a.date === ds)
        .map((a) => {
          const [h, mn] = a.time.split(":").map(Number);
          const start = (h || 0) + (mn || 0) / 60;
          return {
            start,
            dur: 1, 
            title: a.title,
            buffer: a.bufferMin / 60,
            brand: ds === today,
          };
        })
        .filter((e) => e.start >= 0 && e.start < 24);
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
        count: appts.filter((a) => a.date === ds).length,
      };
    });
  });

  ymd(d: Date): string {
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  getShortDayName(d: Date): string {
    return d.toLocaleDateString(this.ar ? "ar-EG" : "en-US", { weekday: "short" });
  }

  prevWeek() {
    this.anchor.update(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7));
  }

  nextWeek() {
    this.anchor.update(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7));
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
}
