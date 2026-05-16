import { Component, inject, computed, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { TasksStore } from '../../tasks.store';
import { AppointmentsStore } from '../../../appointments/appointments.store';
import { authStore } from '../../../../auth/auth.store';
import { Task, TaskPriority } from '../../services/task.service';
import { NotificationsStore } from '../../../../../shared/stores/notifications.store';
import { ToastService } from '../../../../../shared/services/toast.service';

type FilterPriority = 'all' | TaskPriority;

@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './tasks-page.component.html',
  styleUrl: './tasks-page.component.css',
})
export class TasksPageComponent {
  tasksStore = inject(TasksStore);
  appointmentsStore = inject(AppointmentsStore);
  private authStoreInstance = inject(authStore);
  private notificationsStore = inject(NotificationsStore);
  private toastService = inject(ToastService);

  ar = true;
  quickAdd = '';
  filterPriority = signal<FilterPriority>('all');
  filterAppt = signal<string>('all');
  onlyAttached = signal(false);
  expandedTasks = signal<Set<string>>(new Set());
  newSubInputs: Record<string, string> = {};

  // ─── Create Task Modal State ───────────────────────
  @ViewChild('taskModal') taskModal!: ElementRef<HTMLDialogElement>;
  newTaskTitle = '';
  newTaskDescription = '';
  newTaskAppointmentId = 'none';
  newTaskPriority: TaskPriority = 'medium';

  priorities: { id: TaskPriority; ar: string; en: string }[] = [
    { id: 'low', ar: 'منخفضة', en: 'Low' },
    { id: 'medium', ar: 'متوسطة', en: 'Medium' },
    { id: 'high', ar: 'عالية', en: 'High' },
  ];

  appointments = computed(() => this.appointmentsStore.appointments());

  filteredTasks = computed(() => {
    const raw = this.tasksStore.tasks();
    const priority = this.filterPriority();
    const appt = this.filterAppt();
    const attached = this.onlyAttached();

    return [...raw]
      .sort((a, b) => a.order - b.order)
      .filter(t => priority === 'all' || t.priority === priority)
      .filter(t => {
        if (appt === 'all') return true;
        if (appt === 'none') return !t.appointmentId;
        return t.appointmentId === appt;
      })
      .filter(t => attached ? !!t.attachmentName : true);
  });

  buckets = computed(() => {
    const tasks = this.filteredTasks();
    const appointments = this.appointments();
    const overdue: Task[] = [];
    const soon: Task[] = [];
    const upcoming: Task[] = [];
    const done: Task[] = [];

    tasks.forEach(t => {
      if (t.status === 'done') { done.push(t); return; }
      const appt = appointments.find(a => a.id === t.appointmentId);
      if (!appt) { upcoming.push(t); return; }
      const mins = this.minutesUntil(this.apptDeadline(appt));
      if (mins < 0) overdue.push(t);
      else if (mins <= 60) soon.push(t);
      else upcoming.push(t);
    });

    return { overdue, soon, upcoming, done };
  });

  stats = computed(() => {
    const b = this.buckets();
    return [
      { label: 'متأخرة', value: b.overdue.length, accent: 'danger' as const },
      { label: 'وشيكة', value: b.soon.length, accent: 'brand' as const },
      { label: 'قادمة', value: b.upcoming.length, accent: '' as const },
      { label: 'مكتملة', value: b.done.length, accent: 'success' as const },
    ];
  });

  unlinkedAppointments = computed(() => {
    const tasks = this.tasksStore.tasks();
    return this.appointments().filter(a => !tasks.some(t => t.appointmentId === a.id)).slice(0, 4);
  });

  allLinked = computed(() => {
    const tasks = this.tasksStore.tasks();
    return this.appointments().every(a => tasks.some(t => t.appointmentId === a.id));
  });

  hasActiveFilters = computed(() =>
    this.filterPriority() !== 'all' || this.filterAppt() !== 'all' || this.onlyAttached()
  );

  // ─── Actions ───────────────────────────────────────
  submitQuick() {
    if (!this.quickAdd.trim()) return;
    const user = this.authStoreInstance.user();
    if (!user?.id) return;
    const title = this.quickAdd.trim();
    this.tasksStore.addTask({
      userId: user.id,
      title,
      status: 'todo',
      priority: 'medium',
      subtasks: [],
      order: 0,
      createdAt: Date.now(),
    } as Task);
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
      this.newTaskAppointmentId = defaultAppointmentId;
    }
    this.taskModal.nativeElement.showModal();
  }

  closeAddTask() {
    this.taskModal.nativeElement.close();
  }

  submitTask() {
    if (!this.newTaskTitle.trim()) return;
    const user = this.authStoreInstance.user();
    if (!user?.id) return;
    const title = this.newTaskTitle.trim();
    this.tasksStore.addTask({
      userId: user.id,
      title,
      description: this.newTaskDescription.trim() || undefined,
      appointmentId: this.newTaskAppointmentId === 'none' ? undefined : this.newTaskAppointmentId,
      status: 'todo',
      priority: this.newTaskPriority,
      subtasks: [],
      order: 0,
      createdAt: Date.now(),
    } as Task);
    this.notificationsStore.push({
      kind: 'info',
      title: this.ar ? 'مهمة جديدة مرتبطة بخطتك' : 'New task created',
      body: title,
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
    this.newTaskAppointmentId = 'none';
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
    this.tasksStore.setTaskStatus(task.id!, task.status === 'done' ? 'todo' : 'done');
  }

  startTask(task: Task) {
    this.tasksStore.setTaskStatus(task.id!, 'in_progress');
  }

  deleteTask(id: string) {
    this.tasksStore.removeTask(id);
  }

  toggleExpanded(id: string) {
    this.expandedTasks.update(set => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  isExpanded(id: string): boolean {
    return this.expandedTasks().has(id);
  }

  addSubtask(taskId: string) {
    const title = this.newSubInputs[taskId];
    if (!title?.trim()) return;
    this.tasksStore.addSubtask(taskId, title);
    this.newSubInputs[taskId] = '';
    if (!this.isExpanded(taskId)) {
      this.toggleExpanded(taskId);
    }
  }

  toggleSubtask(taskId: string, subId: string) {
    this.tasksStore.toggleSubtask(taskId, subId);
  }

  removeSubtask(taskId: string, subId: string) {
    this.tasksStore.removeSubtask(taskId, subId);
  }

  clearFilters() {
    this.filterPriority.set('all');
    this.filterAppt.set('all');
    this.onlyAttached.set(false);
  }

  // ─── Helpers ───────────────────────────────────────
  getAppointmentTitle(id: string | undefined): string | null {
    if (!id) return null;
    return this.appointments().find(a => a.id === id)?.title ?? null;
  }

  getCountdown(task: Task): { text: string; overdue: boolean; soon: boolean } | null {
    const appt = this.appointments().find(a => a.id === task.appointmentId);
    if (!appt) return null;
    const mins = this.minutesUntil(this.apptDeadline(appt));
    return {
      text: `${appt.title} · ${this.formatCountdown(mins)}`,
      overdue: mins < 0,
      soon: mins >= 0 && mins <= 60,
    };
  }

  getSubProgress(task: Task): number {
    if (!task.subtasks.length) return 0;
    return Math.round((task.subtasks.filter(s => s.done).length / task.subtasks.length) * 100);
  }

  getSubDoneCount(task: Task): number {
    return task.subtasks.filter(s => s.done).length;
  }

  getPriorityChip(priority: TaskPriority): { cls: string; label: string } {
    switch (priority) {
      case 'high': return { cls: 'border-brand/40 bg-brand/10 text-brand', label: 'عالية' };
      case 'low': return { cls: 'border-ink-border bg-ink text-ink-muted', label: 'منخفضة' };
      default: return { cls: 'border-ink-fg/30 bg-ink-fg/10 text-ink-fg', label: 'متوسطة' };
    }
  }

  private apptDeadline(a: { date: string; time: string }): Date {
    const [h, m] = a.time.split(':').map(Number);
    const d = new Date(a.date);
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
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
    if (days) parts.push(`${days} يوم`);
    if (hours) parts.push(`${hours} س`);
    if (!days) parts.push(`${minutes} د`);
    return (mins < 0 ? 'متأخر ' : 'خلال ') + parts.join(' ');
  }
}
