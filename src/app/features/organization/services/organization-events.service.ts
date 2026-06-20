import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateEventInput,
  IEvent,
} from '../../user/events/interfaces/Ievents';
import { EventService } from '../../user/events/services/event.service';

export type OrganizationEvent = IEvent;
export type CreateOrganizationEventInput = CreateEventInput;
export type UpdateOrganizationEventInput = Partial<CreateEventInput>;

interface ApiResponse<T> {
  status: string;
  message?: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class OrganizationEventsService {
  private readonly http = inject(HttpClient);
  private readonly eventService = inject(EventService);
  private readonly api = `${environment.apiUrl}/events`;

  getEvents(): Observable<OrganizationEvent[]> {
    return this.http
      .get<ApiResponse<{ results: number; events: OrganizationEvent[] }>>(
        `${this.api}/company/my-events`,
      )
      .pipe(
        map((response) => response.data.events),
        switchMap((events) => this.eventService.enrichEvents(events)),
      );
  }

  createEvent(event: CreateOrganizationEventInput): Observable<OrganizationEvent> {
    return this.http
      .post<ApiResponse<{ event: OrganizationEvent }>>(this.api, event)
      .pipe(
        map((response) => response.data.event),
        switchMap((created) =>
          this.eventService.getEvent(created._id).pipe(
            catchError(() => of({ ...created, attendeesCount: 0 })),
          ),
        ),
      );
  }

  updateEvent(
    id: string,
    changes: UpdateOrganizationEventInput,
  ): Observable<OrganizationEvent> {
    return this.http
      .patch<ApiResponse<{ event: OrganizationEvent }>>(`${this.api}/${id}`, changes)
      .pipe(
        map((response) => response.data.event),
        switchMap((updated) =>
          this.eventService.getEvent(updated._id).pipe(
            catchError(() => of(updated)),
          ),
        ),
      );
  }

  deleteEvent(id: string): Observable<void> {
    return this.http.delete(`${this.api}/${id}`).pipe(map((): void => void 0));
  }

  toggleEventStatus(id: string): Observable<OrganizationEvent> {
    return this.http
      .patch<ApiResponse<{ event: OrganizationEvent }>>(
        `${this.api}/${id}/toggle-status`,
        {},
      )
      .pipe(map((response) => response.data.event));
  }
}
