import { TranslatePipe } from '@ngx-translate/core';
import { Component, inject, computed, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { TasksStore } from '../../tasks.store';
import { authStore } from '../../../../auth/auth.store';
import { Task, TaskPriority, TaskStatus, CreateTaskPayload } from '../../services/task.service';
import { NotificationsStore } from '../../../../../shared/stores/notifications.store';
import { ToastService } from '../../../../../shared/services/toast.service';
import { LanguageService } from '../../../../../core/services/language.service';

type FilterPriority = 'all' | TaskPriority;

@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [TranslatePipe, CommonModule, FormsModule, IconComponent],
  templateUrl: './tasks-page.component.html',
  styleUrl: './tasks-page.component.css',
})
export class TasksPageComponent {
  tasksStore = inject(TasksStore);
  private auth = inject(authStore);
  private notificationsStore = inject(NotificationsStore);
  private toastService = inject(ToastService);
  readonly language = inject(LanguageService);

  get ar(): boolean {
    return this.language.isArabic();
  }
  quickAdd = '';
  filterPriority = signal<FilterPriority>('all');
  filterAppt = signal<string>('all');

  // ─── Create Task Modal State ───────────────────────
  @ViewChild('taskModal') taskModal!: ElementRef<HTMLDialogElement>;
  newTaskTitle = '';
  newTaskDescription = '';
  newTaskLinkedAppointment = 'none';
  newTaskDeadline = '';
  newTaskPriority: TaskPriority = 'medium';

  priorities: { id: TaskPriority; ar: string; en: string }[] = [
    { id: 'low', ar: 'منخفضة', en: 'Low' },
    { id: 'medium', ar: 'متوسطة', en: 'Medium' },
    { id: 'high', ar: 'عالية', en: 'High' },
  ];

  linkableAppointments = computed(() => this.tasksStore.linkableAppointments());

  filteredTasks = computed(() => {
    const raw = this.tasksStore.tasks();
    const priority = this.filterPriority();
    const appt = this.filterAppt();

    return [...raw]
      .filter(t => priority === 'all' || t.priority === priority)
      .filter(t => {
        if (appt === 'all') return true;
        if (appt === 'none') return !t.linkedAppointment;
        if (typeof t.linkedAppointment === 'object' && t.linkedAppointment) {
          return t.linkedAppointment._id === appt;
        }
        return t.linkedAppointment === appt;
      })
      .sort((a, b) => {
        const dA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const dB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return dA - dB;
      });
  });

  buckets = computed(() => {
    const tasks = this.filteredTasks();
    const now = Date.now();
    const lated: Task[] = [];
    const soon: Task[] = [];
    const upcoming: Task[] = [];
    const completed: Task[] = [];

    tasks.forEach(t => {
      if (t.status === 'completed') {
        completed.push(t);
        return;
      }
      if (t.status === 'lated') {
        lated.push(t);
        return;
      }
      // status === 'pending'
      if (t.deadline) {
        const mins = this.minutesUntil(new Date(t.deadline));
        if (mins < 0) {
          lated.push(t);
        } else if (mins <= 60) {
          soon.push(t);
        } else {
          upcoming.push(t);
        }
      } else {
        upcoming.push(t);
      }
    });

    return { lated, soon, upcoming, completed };
  });

  stats = computed(() => {
    const b = this.buckets();
    return [
      {
        label: this.language.text('متأخرة', 'Overdue'),
        value: b.lated.length,
        accent: 'danger' as const,
      },
      {
        label: this.language.text('وشيكة', 'Due soon'),
        value: b.soon.length,
        accent: 'brand' as const,
      },
      {
        label: this.language.text('قادمة', 'Upcoming'),
        value: b.upcoming.length,
        accent: '' as const,
      },
      {
        label: this.language.text('مكتملة', 'Completed'),
        value: b.completed.length,
        accent: 'success' as const,
      },
    ];
  });

  hasActiveFilters = computed(() =>
    this.filterPriority() !== 'all' || this.filterAppt() !== 'all'
  );

  // ─── Actions ───────────────────────────────────────
  submitQuick() {
    const title = this.quickAdd.trim();
    if (!title) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.tasksStore.addTask({
      title,
      priority: 'medium',
      deadline: tomorrow.toISOString(),
    });
    this.notificationsStore.push({
      kind: 'info',
      title: this.ar ? 'تمت إضافة مهمة جديدة' : 'Task added',
      body: title,
      link: '/user/tasks',
    });
    this.toastService.success(this.ar ? 'تمت إضافة المهمة' : 'Task added');
    this.quickAdd = '';
  }

  // ─── Modal Actions ─────────────────────────────────
  openAddTask(defaultAppointmentId?: string) {
    this.resetTaskForm();
    if (defaultAppointmentId) {
      this.newTaskLinkedAppointment = defaultAppointmentId;
    }
    this.taskModal.nativeElement.showModal();
  }

  closeAddTask() {
    this.taskModal.nativeElement.close();
  }

  submitTask() {
    if (!this.newTaskTitle.trim()) return;

    if (this.newTaskLinkedAppointment === 'none' && !this.newTaskDeadline) {
      this.toastService.error(
        this.ar ? 'يرجى تحديد الموعد النهائي للمهمة أو ربطها بموعد' : 'Please specify a deadline or link an appointment'
      );
      return;
    }

    const payload: CreateTaskPayload = {
      title: this.newTaskTitle.trim(),
      description: this.newTaskDescription.trim() || undefined,
      priority: this.newTaskPriority,
    };
    if (this.newTaskLinkedAppointment !== 'none') {
      payload.linkedAppointment = this.newTaskLinkedAppointment;
    } else if (this.newTaskDeadline) {
      payload.deadline = new Date(this.newTaskDeadline).toISOString();
    }
    this.tasksStore.addTask(payload);
    this.notificationsStore.push({
      kind: 'info',
      title: this.ar ? 'مهمة جديدة مرتبطة بخطتك' : 'New task created',
      body: this.newTaskTitle.trim(),
      link: '/user/tasks',
    });
    this.toastService.success(
      this.ar ? 'تم إنشاء المهمة' : 'Task created',
      this.ar ? 'يمكنك تتبعها من لوحة المهام.' : undefined,
    );
    this.closeAddTask();
  }

  private resetTaskForm() {
    this.newTaskTitle = '';
    this.newTaskDescription = '';
    this.newTaskLinkedAppointment = 'none';
    this.newTaskDeadline = '';
    this.newTaskPriority = 'medium';
  }

  addTaskForAppointment(appointmentId: string) {
    this.openAddTask(appointmentId);
  }

  getPriorityTone(id: TaskPriority): string {
    switch (id) {
      case 'high': return 'border-brand bg-brand/10 text-brand';
      case 'medium': return 'border-ink-fg/40 bg-ink-fg/10 text-ink-fg';
      case 'low': return 'border-ink-border bg-ink text-ink-muted';
    }
  }

  toggleStatus(task: Task) {
    this.tasksStore.setTaskStatus(task._id!, task.status === 'completed' ? 'pending' : 'completed');
  }

  deleteTask(id: string) {
    this.tasksStore.removeTask(id);
  }

  clearFilters() {
    this.filterPriority.set('all');
    this.filterAppt.set('all');
  }

  // ─── Helpers ───────────────────────────────────────
  getLinkedAppointmentTitle(task: Task): string | null {
    if (!task.linkedAppointment) return null;
    if (typeof task.linkedAppointment === 'object') return task.linkedAppointment.title;
    return null;
  }

  getDeadlineInfo(task: Task): { text: string; overdue: boolean; soon: boolean } | null {
    if (!task.deadline) return null;
    const mins = this.minutesUntil(new Date(task.deadline));
    const apptTitle = this.getLinkedAppointmentTitle(task);
    const prefix = apptTitle ? `${apptTitle} · ` : '';
    return {
      text: `${prefix}${this.formatCountdown(mins)}`,
      overdue: mins < 0,
      soon: mins >= 0 && mins <= 60,
    };
  }

  getPriorityChip(priority: TaskPriority): { cls: string; label: string } {
    switch (priority) {
      case 'high':
        return {
          cls: 'border-brand/40 bg-brand/10 text-brand',
          label: this.language.text('عالية', 'High'),
        };
      case 'low':
        return {
          cls: 'border-ink-border bg-ink text-ink-muted',
          label: this.language.text('منخفضة', 'Low'),
        };
      default:
        return {
          cls: 'border-ink-fg/30 bg-ink-fg/10 text-ink-fg',
          label: this.language.text('متوسطة', 'Medium'),
        };
    }
  }

  formatAppointmentTime(isoDate: string): string {
    const d = new Date(isoDate);
    return this.language.formatDate(d, { month: 'short', day: 'numeric' }) +
      ' · ' +
      this.language.formatDate(d, { hour: '2-digit', minute: '2-digit' });
  }

  private minutesUntil(date: Date): number {
    return Math.round((date.getTime() - Date.now()) / 60000);
  }

  private formatCountdown(mins: number): string {
    const abs = Math.abs(mins);
    const days = Math.floor(abs / 1440);
    const hours = Math.floor((abs % 1440) / 60);
    const minutes = abs % 60;
    const parts: string[] = [];
    if (days) parts.push(this.language.text(`${days} يوم`, `${days}d`));
    if (hours) parts.push(this.language.text(`${hours} س`, `${hours}h`));
    if (!days) parts.push(this.language.text(`${minutes} د`, `${minutes}m`));
    return (
      (mins < 0
        ? this.language.text('متأخر ', 'overdue by ')
        : this.language.text('خلال ', 'in ')) + parts.join(' ')
    );
  }
}
