import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
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
      .pipe(
        map((response) => response.data.events),
        switchMap((events) => this.enrichEvents(events)),
      );
  }

  getEvent(id: string): Observable<IEvent> {
    return this.http
      .get<ApiResponse<{ event: IEvent }>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => this.normalizeEvent(response.data.event)));
  }

  enrichEvents(events: IEvent[]): Observable<IEvent[]> {
    if (!events.length) return of([]);

    return forkJoin(
      events.map((event) =>
        this.getEvent(event._id).pipe(
          map((detail) =>
            this.normalizeEvent({
              ...event,
              ...detail,
              companyId: event.companyId || detail.companyId,
              distance: event.distance ?? detail.distance,
            }),
          ),
          catchError(() => of(this.normalizeEvent(event))),
        ),
      ),
    );
  }

  addToSchedule(eventId: string, input: AddEventToScheduleInput): Observable<Appointment> {
    return this.http
      .post<ApiResponse<{ appointment: Appointment }>>(
        `${this.apiUrl}/${eventId}/add-to-schedule`,
        input,
      )
      .pipe(map((response) => response.data.appointment));
  }

  private normalizeEvent(event: IEvent): IEvent {
    return {
      ...event,
      location: event.location ?? {
        type: 'Point',
        coordinates: [0, 0],
      },
      images: event.images ?? [],
      isActive: event.isActive ?? event.status !== 'inactive',
      visibility: event.visibility ?? 'public',
      attendeesCount: Number(event.attendeesCount ?? 0),
      distance: event.distance ?? null,
    };
  }
}
