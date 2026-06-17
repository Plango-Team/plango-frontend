import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root', 
})
export class MapService {
  private http = inject(HttpClient)

searchLocation(query:string): Observable<any>{
    const url = `${environment.nominatimUrl}/search?format=jsonv2&q=${encodeURIComponent(query)}&accept-language=ar&limit=5&email=test-plango@gmail.com`;
    return this.http.get<any[]>(url)
  }

}
