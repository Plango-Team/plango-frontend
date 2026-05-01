import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { IAppointment, IRouteResponse } from '../interfaces/Imap';
import polyline from '@mapbox/polyline';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  private http = inject(HttpClient)
  private isDevMode = true // بعد ميخلصوا الباك هنخليها فولس 

  getRoute(origin: {lat: number , lng: number}, destination: {lat: number , lng: number}) : Observable<IRouteResponse> {
    if(this.isDevMode){
      const mockPoly =  polyline.encode([[origin.lat,origin.lng],[destination.lat,destination.lng]])
      return of<IRouteResponse>({
        success: true,
        data: {
          transport_mode: 'car',
          duration: 600,
          distance: 2000,
          polyline: mockPoly
        }
      }).pipe(delay(800));
    }
    return this.http.post<IRouteResponse>(`${environment.apiUrl}/routes/preview`,
      {origin, destination , transport_mode:'car'}
    )
  }
  
  getAppointments(): Observable<IAppointment[]> {
  if (this.isDevMode) {
    const mockAppointments : IAppointment[] = [
      { id: '1', title: 'جامعة المنيا', lng: 30.7550, lat: 28.0850 },
      { id: '2', title: 'نادي المنيا', lng: 30.7520, lat: 28.1050 }
    ];
    return of(mockAppointments).pipe(delay(500));
  }
  return this.http.get<IAppointment[]>(`${environment.apiUrl}/appointments`);
}
}
