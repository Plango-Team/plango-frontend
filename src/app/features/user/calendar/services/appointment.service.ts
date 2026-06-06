import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

export interface Appointment {
  id?: string;
  userId: string;
  date: string;
  time: string;
  title: string;
  origin?: string;
  destination?: string;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  lat?: number;
  lng?: number;
  transport?: string;
  bufferMin: number;
  prepMin?: number;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/appointments`;

  getAppointmentsByUser(userId: string): Observable<Appointment[]> {
    return this.http.get<{ status: string; data: { appointments: Appointment[] } }>(this.apiUrl).pipe(
      map(res => res.data.appointments)
    );
  }

  createAppointment(appointment: Appointment): Observable<Appointment> {
    return this.http.post<{ status: string; data: { appointment: Appointment } }>(this.apiUrl, appointment).pipe(
      map(res => res.data.appointment)
    );
  }

  deleteAppointment(id: string): Observable<void> {
    return this.http.delete<{ status: string; data: null }>(`${this.apiUrl}/${id}`).pipe(
      map((): void => void 0)
    );
  }
}
