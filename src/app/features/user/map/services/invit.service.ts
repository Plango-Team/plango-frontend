import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export interface InviteResponse {
  status: string;
  message: string;
  data: {
    invites: any[];
    warnings?: string[];
  };
}

export interface PendingInvitesResponse {
  status: string;
  message: string;
  data: {
    results: number;
    invites: PendingInvite[];
  };
}

export interface PendingInvite {
  _id: string;
  appointmentId: {
    _id: string;
    title?: string | null;
    description?: string | null;
    arrivalTime?: string | null;
    destinationLocation?: any;
  } | string | null;
  senderId: {
    _id: string;
    name?: string | null;
    username?: string | null;
  } | string | null;
  status: 'pending' | 'accepted' | 'declined';
}

export interface DisplayPendingInvite {
  _id: string;
  appointmentId: {
    _id: string;
    title: string;
    description: string;
    arrivalTime: string | null;
    destinationLocation?: any;
  };
  senderId: {
    _id: string;
    name: string;
    username: string;
  };
  status: 'pending' | 'accepted' | 'declined';
}

export const normalizePendingInvite = (
  invite: PendingInvite | null | undefined,
): DisplayPendingInvite | null => {
  if (
    !invite?._id ||
    !invite.appointmentId ||
    typeof invite.appointmentId !== 'object' ||
    !invite.appointmentId._id
  ) {
    return null;
  }

  const sender =
    invite.senderId && typeof invite.senderId === 'object' ? invite.senderId : null;

  return {
    _id: invite._id,
    appointmentId: {
      _id: invite.appointmentId._id,
      title: invite.appointmentId.title?.trim() || 'موعد مشترك',
      description: invite.appointmentId.description?.trim() || '',
      arrivalTime: invite.appointmentId.arrivalTime || null,
      destinationLocation: invite.appointmentId.destinationLocation,
    },
    senderId: {
      _id: sender?._id || '',
      name: sender?.name?.trim() || 'مستخدم PlanGo',
      username: sender?.username?.trim() || '',
    },
    status: invite.status,
  };
};

export interface AcceptInvitePayload {
  startLocation: {
    addressName: string;
    fullAddress?: string;
    type?: 'Point';
    coordinates: [number, number]; // [long, lat] أو العكس حسب الـ Backend
  };
  transportation: 'driving' | 'walking' | 'bicycling' | 'other';
}

export interface AcceptInviteResponse {
  status: string;
  message: string;
  data: {
    invite: {
      status: 'accepted';
      estimatedTravelTime: number;
      polyline: string;
      stepsCount: number | null;
      caloriesBurned: number | null;
      travelHours: number;
    };
  };
}

export interface DeclineInviteResponse {
  status: string;
  message: string;
  data: {
    invite: {
      status: 'declined';
    };
  };
}
@Injectable({
  providedIn: 'root',
})
export class InvitService {
  private readonly http = inject(HttpClient);

  sendInvitation(appointmentId: string, usernames: string[]): Observable<InviteResponse> {
    const body = { usernames };
    return this.http.post<InviteResponse>(
      `${environment.apiUrl}/invites/${appointmentId}/invite`,
      body,
    );
  }

  getMyPendingInvitations(): Observable<PendingInvitesResponse> {
    return this.http.get<PendingInvitesResponse>(
      `${environment.apiUrl}/invites/my-pending-invites`,
    );
  }

  acceptInvitation(
    appointmentId: string,
    payload: AcceptInvitePayload,
  ): Observable<AcceptInviteResponse> {
    return this.http.put<AcceptInviteResponse>(
      `${environment.apiUrl}/invites/${appointmentId}/accept`,
      payload,
    );
  }

  declineInvitation(appointmentId: string): Observable<DeclineInviteResponse> {
    return this.http.put<DeclineInviteResponse>(
      `${environment.apiUrl}/invites/${appointmentId}/decline`,
      {},
    );
  }
}
