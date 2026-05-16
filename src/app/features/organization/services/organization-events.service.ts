import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type AttendanceStatus = 'confirmed' | 'en_route' | 'arrived' | 'at_risk' | 'declined';
export type OrganizationEventCategory = 'tech' | 'art' | 'music' | 'photo' | 'culture' | 'sport';

export interface OrganizationEvent {
  id?: string;
  ownerId: string;
  title: string;
  host: string;
  date: string;
  time: string;
  place: string;
  category: OrganizationEventCategory;
  price: string;
  description?: string;
  distanceKm?: number;
  createdAt: number;
}

export type CreateOrganizationEventInput = Omit<OrganizationEvent, 'id' | 'createdAt'>;

export interface OrganizationAttendance {
  id?: string;
  eventId: string;
  attendeeId: string;
  status: AttendanceStatus;
  travelMin: number;
  departureAt: number;
  updatedAt: number;
}

@Injectable({ providedIn: 'root' })
export class OrganizationEventsService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  getEvents(): Observable<OrganizationEvent[]> {
    return this.http.get<OrganizationEvent[]>(`${this.api}/orgEvents`);
  }

  createEvent(event: CreateOrganizationEventInput): Observable<OrganizationEvent> {
    return this.http.post<OrganizationEvent>(`${this.api}/orgEvents`, {
      ...event,
      createdAt: Date.now(),
    });
  }

  updateEvent(event: OrganizationEvent): Observable<OrganizationEvent> {
    return this.http.put<OrganizationEvent>(`${this.api}/orgEvents/${event.id}`, event);
  }

  deleteEvent(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/orgEvents/${id}`);
  }

  getAttendances(): Observable<OrganizationAttendance[]> {
    return this.http.get<OrganizationAttendance[]>(`${this.api}/orgAttendances`);
  }

  createAttendance(
    attendance: Omit<OrganizationAttendance, 'id' | 'updatedAt'>,
  ): Observable<OrganizationAttendance> {
    return this.http.post<OrganizationAttendance>(`${this.api}/orgAttendances`, {
      ...attendance,
      updatedAt: Date.now(),
    });
  }

  updateAttendance(attendance: OrganizationAttendance): Observable<OrganizationAttendance> {
    return this.http.put<OrganizationAttendance>(
      `${this.api}/orgAttendances/${attendance.id}`,
      attendance,
    );
  }

  loadAll(): Observable<{
    events: OrganizationEvent[];
    attendances: OrganizationAttendance[];
  }> {
    return forkJoin({
      events: this.getEvents(),
      attendances: this.getAttendances(),
    });
  }
}
