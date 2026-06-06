import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class InvitService {
  http = inject(HttpClient)

  sendInvitations(tripId:number,invitData:any):Observable<any>{
    return this.http.post(`${environment.apiUrl}/${tripId}/invites`,invitData)
  }

  acceptInvitation(tripId: number, inviteId: string): Observable<any> {
  return this.http.patch(`${environment.apiUrl}/${tripId}/invites/${inviteId}/accept`,{});
}
}
