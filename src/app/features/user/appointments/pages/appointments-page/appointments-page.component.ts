import { TranslatePipe } from '@ngx-translate/core';
import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { SetLocationModalComponent } from '../../../dashboard/components/set-location-modal/set-location-modal.component';
import { MapStore } from '../../../map/map.store';
import { AppointmentsStore } from '../../appointments.store';
import { Appointment } from '../../interfaces/IAppointment';
import { LanguageService } from '../../../../../core/services/language.service';

@Component({
  selector: 'app-appointments-page',
  imports: [TranslatePipe, DatePipe, RouterLink, IconComponent, SetLocationModalComponent],
  templateUrl: './appointments-page.component.html',
  styleUrl: './appointments-page.component.css',
})
export class AppointmentsPageComponent {
  readonly appointmentStore = inject(AppointmentsStore);
  private readonly mapStore = inject(MapStore);
  private readonly router = inject(Router);
  readonly language = inject(LanguageService);

  readonly upcomingAppointments = computed(() => {
    const now = Date.now();
    return this.appointmentStore
      .appointments()
      .filter(
        (appointment) =>
          !appointment.isCompleted && new Date(appointment.arrivalTime).getTime() >= now,
      )
      .sort((a, b) => new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime());
  });

  readonly previousAppointments = computed(() => {
    const now = Date.now();
    return this.appointmentStore
      .appointments()
      .filter(
        (appointment) =>
          appointment.isCompleted || new Date(appointment.arrivalTime).getTime() < now,
      )
      .sort((a, b) => new Date(b.arrivalTime).getTime() - new Date(a.arrivalTime).getTime())
      .slice(0, 6);
  });

  readonly eventAppointments = computed(() =>
    this.upcomingAppointments().filter((appointment) => !!appointment.eventId),
  );

  refresh(): void {
    this.appointmentStore.reloadAppointmentsNow();
    this.appointmentStore.loadPendingInvitations();
  }

  destinationLabel(appointment: Appointment): string {
    return (
      appointment.destinationLocation?.addressName ||
      appointment.destinationLocation?.fullAddress ||
      appointment.destinationLocation?.fullAddres ||
      this.language.text('الموقع غير محدد', 'Location not specified')
    );
  }

  sourceLabel(appointment: Appointment): string {
    return appointment.eventId
      ? this.language.text('من فعالية', 'From event')
      : this.language.text('موعد شخصي', 'Personal appointment');
  }

  sourceClasses(appointment: Appointment): string {
    return appointment.eventId
      ? 'border-brand/30 bg-brand/10 text-brand'
      : 'border-ink-border bg-ink text-ink-muted';
  }

  transportLabel(mode: string): string {
    const labels: Record<string, string> = {
      driving: this.language.text('سيارة', 'Car'),
      walking: this.language.text('مشي', 'Walking'),
      bicycling: this.language.text('دراجة', 'Bicycle'),
      other: this.language.text('مواصلات', 'Public transport'),
      publicTransport: this.language.text('مواصلات', 'Public transport'),
      car: this.language.text('سيارة', 'Car'),
      walk: this.language.text('مشي', 'Walking'),
    };
    return labels[mode] ?? mode;
  }

  distanceLabel(appointment: Appointment): string {
    const meters = appointment.distanceInMeters ?? 0;
    if (!meters) return this.language.text('غير متاح', 'Unavailable');
    return `${(meters / 1000).toFixed(1)} ${this.language.text('كم', 'km')}`;
  }

  travelTimeLabel(appointment: Appointment): string {
    const minutes = Math.round(appointment.estimatedTravelTime ?? 0);
    return minutes
      ? `${minutes} ${this.language.text('دقيقة', 'min')}`
      : this.language.text('غير متاح', 'Unavailable');
  }

  participantCount(appointment: Appointment): number {
    return appointment.participants?.filter((participant) => participant.receiverId).length ?? 0;
  }

  openOnMap(appointment: Appointment): void {
    this.mapStore.loadRouteFromAppointment(appointment);
    void this.router.navigate(['/user/map']);
  }

  removeAppointment(appointment: Appointment): void {
    this.appointmentStore.removeAppointment(appointment._id);
  }

}
