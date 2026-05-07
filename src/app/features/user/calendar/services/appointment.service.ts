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
  destination?: string;
  transport?: string;
  bufferMin: number;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/appointments`;

  getAppointmentsByUser(userId: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(this.apiUrl).pipe(
      map(appointments => appointments.filter(a => a.userId === userId))
    );
  }

  createAppointment(appointment: Appointment): Observable<Appointment> {
    return this.http.post<Appointment>(this.apiUrl, appointment);
  }
}
