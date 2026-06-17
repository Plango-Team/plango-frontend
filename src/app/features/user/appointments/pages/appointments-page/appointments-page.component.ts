import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { SetLocationModalComponent } from '../../../dashboard/components/set-location-modal/set-location-modal.component';
import { MapStore } from '../../../map/map.store';
import { AppointmentsStore } from '../../appointments.store';
import { Appointment } from '../../interfaces/IAppointment';

@Component({
  selector: 'app-appointments-page',
  imports: [DatePipe, RouterLink, IconComponent, SetLocationModalComponent],
  templateUrl: './appointments-page.component.html',
  styleUrl: './appointments-page.component.css',
})
export class AppointmentsPageComponent {
  readonly appointmentStore = inject(AppointmentsStore);
  private readonly mapStore = inject(MapStore);
  private readonly router = inject(Router);

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
      'الموقع غير محدد'
    );
  }

  sourceLabel(appointment: Appointment): string {
    return appointment.eventId ? 'من فعالية' : 'موعد شخصي';
  }

  sourceClasses(appointment: Appointment): string {
    return appointment.eventId
      ? 'border-brand/30 bg-brand/10 text-brand'
      : 'border-ink-border bg-ink text-ink-muted';
  }

  transportLabel(mode: string): string {
    const labels: Record<string, string> = {
      driving: 'سيارة',
      walking: 'مشي',
      bicycling: 'دراجة',
      other: 'مواصلات',
      publicTransport: 'مواصلات',
      car: 'سيارة',
      walk: 'مشي',
    };
    return labels[mode] ?? mode;
  }

  distanceLabel(appointment: Appointment): string {
    const meters = appointment.distanceInMeters ?? 0;
    if (!meters) return 'غير متاح';
    return `${(meters / 1000).toFixed(1)} كم`;
  }

  travelTimeLabel(appointment: Appointment): string {
    const minutes = Math.round(appointment.estimatedTravelTime ?? 0);
    return minutes ? `${minutes} دقيقة` : 'غير متاح';
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
