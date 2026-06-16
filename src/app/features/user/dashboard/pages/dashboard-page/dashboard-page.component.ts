import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DashboardAppointmentsComponent } from '../../components/dashboard-appointments/dashboard-appointments.component';
import { CardComponent } from "../../../../../shared/ui/card/card.component";
import { IconComponent } from "../../../../../shared/components/icon/icon.component";
import { authStore } from '../../../../auth/auth.store';
import { TasksStore } from '../../../tasks/tasks.store';
import { AppointmentsStore } from '../../../appointments/appointments.store';
import { AcceptInvitePayload } from '../../../map/services/invit.service';
import { MapStore } from '../../../map/map.store';
import { SetLocationModalComponent } from "../../components/set-location-modal/set-location-modal.component";

@Component({
  imports: [DashboardAppointmentsComponent, CardComponent, IconComponent, RouterModule, SetLocationModalComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css',
})
export class DashboardPageComponent {
  public authStore = inject(authStore);
  appStore = inject(AppointmentsStore)
  mapStore = inject(MapStore)
  public tasksStore = inject(TasksStore);

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
getMinutesRemaining(arrivalTime:string | Date) : number{
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
