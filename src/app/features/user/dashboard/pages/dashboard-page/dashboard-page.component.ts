import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DashboardAppointmentsComponent } from '../../components/dashboard-appointments/dashboard-appointments.component';
import { CardComponent } from "../../../../../shared/ui/card/card.component";
import { IconComponent } from "../../../../../shared/components/icon/icon.component";
import { authStore } from '../../../../auth/auth.store';
import { TasksStore } from '../../../tasks/tasks.store';
import { AppointmentsStore } from '../../../appointments/appointments.store';
import { MapStore } from '../../../map/map.store';
import { SetLocationModalComponent } from "../../components/set-location-modal/set-location-modal.component";
import { DashboardEventsComponent } from "../../components/dashboard-events/dashboard-events.component";
import { Appointment } from '../../../appointments/interfaces/IAppointment';

@Component({
  imports: [DashboardAppointmentsComponent, CardComponent, IconComponent, RouterModule, SetLocationModalComponent, DashboardEventsComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css',
})
export class DashboardPageComponent {
  public authStore = inject(authStore);
  appStore = inject(AppointmentsStore)
  mapStore = inject(MapStore)
  public tasksStore = inject(TasksStore);
  nextAppointment = computed(() => this.mapStore.nextAppointment());
  sharedAppointments = computed(() =>
    this.appStore
      .appointments()
      .filter((appointment) => (appointment.participants?.length ?? 0) > 0)
      .slice(0, 3),
  );

  // ─── Real Task Stats ─────────────────────────────────
  totalTasks = computed(() => this.tasksStore.tasks().length);

  completedTasks = computed(() =>
    this.tasksStore.tasks().filter(t => t.status === 'completed').length
  );

  pendingTasks = computed(() =>
    this.tasksStore.tasks().filter(t => t.status === 'pending').length
  );

  latedTasks = computed(() =>
    this.tasksStore.tasks().filter(t => t.status === 'lated').length
  );

  completionPercentage = computed(() => {
    const total = this.totalTasks();
    if (total === 0) return 0;
    return Math.round((this.completedTasks() / total) * 100);
  });

  departureInMinutes = computed(() => {
    const appointment = this.nextAppointment();
    if (!appointment) return null;
    const departure = appointment.actualDepartureTime
      ? new Date(appointment.actualDepartureTime)
      : new Date(
          new Date(appointment.arrivalTime).getTime() -
            (appointment.estimatedTravelTime ?? 0) * 60_000,
        );
    return Math.floor((departure.getTime() - Date.now()) / 60_000);
  });

  // ─── Today's date formatted in Arabic ─────────────────
  todayFormatted = computed(() => {
    const now = new Date();
    return now.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  // ─── Greeting based on time of day ────────────────────
  greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 18) return 'مساء الخير';
    return 'مساء الخير';
  });

  formatTime(arrivalTime: string | Date): string {
  if (!arrivalTime) return '';
  const dateObj = new Date(arrivalTime);
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

formatDate(arrivalTime: string | Date): string {
  if (!arrivalTime) return '';
  const dateObj = new Date(arrivalTime);
  return dateObj.toISOString().split('T')[0]; 
}

destinationLabel(appointment: Appointment): string {
  return (
    appointment.destinationLocation?.addressName ||
    appointment.destinationLocation?.fullAddress ||
    appointment.destinationLocation?.fullAddres ||
    'الموقع غير محدد'
  );
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

departureTimeLabel(appointment: Appointment): string {
  const departure = appointment.actualDepartureTime
    ? new Date(appointment.actualDepartureTime)
    : new Date(
        new Date(appointment.arrivalTime).getTime() -
          (appointment.estimatedTravelTime ?? 0) * 60_000,
      );
  return this.formatTime(departure);
}

participantCount(appointment: Appointment): number {
  return appointment.participants?.filter((participant) => participant.receiverId).length ?? 0;
}
getMinutesRemaining(arrivalTime: string | Date | null): number {
  if (!arrivalTime) return -1;
  const now = new Date();
  const eventTime = new Date(arrivalTime);
  const diffMins = eventTime.getTime() - now.getTime();
  return Math.floor(diffMins / (1000 * 60))
}

onDeclineInvite(appointmentId: string) {
  this.appStore.declineInvitation(appointmentId);
}

}
