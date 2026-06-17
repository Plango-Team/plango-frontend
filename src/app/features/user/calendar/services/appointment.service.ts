import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { Appointment, AppointmentPayload, AppointmentResponce } from '../../appointments/interfaces/IAppointment';

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

  getAppointmentById(id: string): Observable<Appointment> {
    return this.http
      .get<{ status: string; data: { appointment: Appointment } }>(`${this.apiUrl}/${id}`)
      .pipe(map((res) => res.data.appointment));
  }

  createAppointment(appointment: AppointmentPayload): Observable<AppointmentResponce> {
    return this.http.post<AppointmentResponce>(this.apiUrl, appointment);
  }

  updateAppointment(id: string,appointment: AppointmentPayload): Observable<AppointmentResponce> {
    return this.http.put<AppointmentResponce>(`${this.apiUrl}/${id}`,appointment);
  }

  deleteAppointment(id: string): Observable<void> {
    return this.http.delete<{ status: string; message: string }>(`${this.apiUrl}/${id}`).pipe(
      map((): void => void 0)
    );
  }

  deleteSerialAppointment(Sid: string): Observable<any> {
    return this.http.delete<{ status: string; message: string ; data : { result :{deletedCount : number}}}>(`${this.apiUrl}/series/${Sid}`).pipe(
      map((): void => void 0)
    );
  }
}

