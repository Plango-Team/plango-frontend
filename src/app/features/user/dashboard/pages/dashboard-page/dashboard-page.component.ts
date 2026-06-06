import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DashboardAppointmentsComponent } from '../../components/dashboard-appointments/dashboard-appointments.component';
import { CardComponent } from "../../../../../shared/ui/card/card.component";
import { IconComponent } from "../../../../../shared/components/icon/icon.component";
import { authStore } from '../../../../auth/auth.store';
import { TasksStore } from '../../../tasks/tasks.store';

@Component({
  imports: [DashboardAppointmentsComponent, CardComponent, IconComponent, RouterModule],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css',
})
export class DashboardPageComponent {
  public authStore = inject(authStore);
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
}
