import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

// ─── Types ───────────────────────────────────────────────────────
export type TaskStatus = 'pending' | 'completed' | 'lated';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  _id?: string;
  title: string;
  description?: string;
  deadline?: string;
  status: TaskStatus;
  reminderTime?: string;
  priority: TaskPriority;
  linkedAppointment?: { _id: string; title: string; arrivalTime: string } | string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: TaskPriority;
  deadline?: string;
  linkedAppointment?: string;
  reminderTime?: string;
}

export interface LinkableAppointment {
  _id: string;
  title: string;
  arrivalTime: string;
}

// ─── Service ─────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class TaskService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tasks`;

  getTasks(): Observable<Task[]> {
    return this.http
      .get<{ status: string; data: { results: number; tasks: Task[] } }>(this.apiUrl)
      .pipe(map(res => res.data.tasks));
  }

  createTask(payload: CreateTaskPayload): Observable<Task> {
    return this.http
      .post<{ status: string; data: { task: Task } }>(this.apiUrl, payload)
      .pipe(map(res => res.data.task));
  }

  updateTask(id: string, data: Partial<CreateTaskPayload & { status: TaskStatus }>): Observable<Task> {
    return this.http
      .put<{ status: string; data: { task: Task } }>(`${this.apiUrl}/${id}`, data)
      .pipe(map(res => res.data.task));
  }

  deleteTask(id: string): Observable<void> {
    return this.http
      .delete<{ status: string; data: null }>(`${this.apiUrl}/${id}`)
      .pipe(map((): void => void 0));
  }

  getLinkableAppointments(): Observable<LinkableAppointment[]> {
    return this.http
      .get<{ status: string; data: { results: number; appointments: LinkableAppointment[] } }>(`${this.apiUrl}/linkable-appointments`)
      .pipe(map(res => res.data.appointments));
  }
}
