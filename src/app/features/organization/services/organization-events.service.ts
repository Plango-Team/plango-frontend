import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateEventInput,
  IEvent,
} from '../../user/events/interfaces/Ievents';

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
  private readonly api = `${environment.apiUrl}/events`;

  getEvents(): Observable<OrganizationEvent[]> {
    return this.http
      .get<ApiResponse<{ results: number; events: OrganizationEvent[] }>>(
        `${this.api}/company/my-events`,
      )
      .pipe(map((response) => response.data.events));
  }

  createEvent(event: CreateOrganizationEventInput): Observable<OrganizationEvent> {
    return this.http
      .post<ApiResponse<{ event: OrganizationEvent }>>(this.api, event)
      .pipe(map((response) => response.data.event));
  }

  updateEvent(
    id: string,
    changes: UpdateOrganizationEventInput,
  ): Observable<OrganizationEvent> {
    return this.http
      .patch<ApiResponse<{ event: OrganizationEvent }>>(`${this.api}/${id}`, changes)
      .pipe(map((response) => response.data.event));
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
