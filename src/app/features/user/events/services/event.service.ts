import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  AddEventToScheduleInput,
  IEvent,
  IEventFilters,
} from '../interfaces/Ievents';
import { Appointment } from '../../appointments/interfaces/IAppointment';

interface ApiResponse<T> {
  status: string;
  message?: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/events`;

  getEvents(filters: IEventFilters = {}): Observable<IEvent[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }

    return this.http
      .get<ApiResponse<{ results: number; events: IEvent[] }>>(this.apiUrl, { params })
      .pipe(map((response) => response.data.events));
  }

  getEvent(id: string): Observable<IEvent> {
    return this.http
      .get<ApiResponse<{ event: IEvent }>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data.event));
  }

  addToSchedule(eventId: string, input: AddEventToScheduleInput): Observable<Appointment> {
    return this.http
      .post<ApiResponse<{ appointment: Appointment }>>(
        `${this.apiUrl}/${eventId}/add-to-schedule`,
        input,
      )
      .pipe(map((response) => response.data.appointment));
  }
}
