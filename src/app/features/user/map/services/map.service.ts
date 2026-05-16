import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { IAppointment, IRouteResponse ,Friend, ITrip,ChatMessage} from '../interfaces/Imap';
import polyline from '@mapbox/polyline';
import { authStore } from '../../../auth/auth.store';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  private http = inject(HttpClient)
  authstore = inject(authStore)
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

  searchLocation(quary:string): Observable<any>{
    const url = `http://nominatim.openstreetmap.org/search?format=json&q=${quary}`;
    return this.http.get<any[]>(url)
  }
  //************************************
  getAppointments(): Observable<IAppointment[]> {
  if (this.isDevMode) {
    const mockAppointments : IAppointment[] = [
      { id: '1', title: 'جامعة المنيا', lng: 30.7450, lat: 28.1130 ,transport_mode: 'car' , appointmenttime:'10:00',states:'نشط'},
      { id: '2', title: 'نادي المنيا', lng: 30.7520, lat: 28.1050 ,transport_mode: 'car' , appointmenttime:'04:00',states:'غير نشط' }
    ];
    return of(mockAppointments).pipe(delay(500));
  }
  return this.http.get<IAppointment[]>(`${environment.apiUrl}/appointments`);
}

getTripInfo(): Observable<ITrip>{
  if (this.isDevMode) {
  const mockTrip : ITrip= {
    id: 1,
    tripTitle: 'إجتماع الفريق',
    location: 'جامعة المنيا، كلية علوم',
    lat:28.1130,
    lng:30.7450,
    startTime:'09:30',
    remainingTime: 30,
    appointmentTime:'10:00',
    arrivalTime: '10:30',
    chatMessages:[
    {
      id: 1,
      sender : 'بسمة جمال',
      text: 'هتأخر شوية',
      time: '10:15',
    },
    {
      id: 2,
      sender : 'مرام عامر',
      text: 'أنا وصلت',
      time: '10:00',
    },
    {
      id: 3,
      sender : 'أريج حسنيين',
      text: 'خرجت دلوقتي',
      time: '09:45',
    },
  ],
    showTripMenu:false
  };
  return of(mockTrip).pipe(delay(300));
}

  return this.http.get<any>(`${environment.apiUrl}/mk`) ; //api مثلا
}

getFriends(): Observable<Friend[]> {
    if (this.isDevMode) {
  const mockFriends: Friend[] = [
    {
      id: 1,
      name: 'أريج حسنين',
      late: 4386,
      arrive: 45,
      distance: 25.4,
      states: 'في الطريق',
      transport_mode: 'walk',
      lat: 27.9350,
      lng: 30.8350,
    },
    {
      id: 2,
      name: 'مرام عامر',
      late: 4363,
      arrive: 15,
      distance: 12.2,
      states: 'وصل',
      transport_mode: 'car',
      lat: 28.1170,
      lng: 30.7850,
    }
  ];
  return of(mockFriends).pipe(delay(500));}
  return this.http.get<any>(`${environment.apiUrl}/mk`) ; //api مثلا
}

}
