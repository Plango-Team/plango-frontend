import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

export interface FollowResponse {
  _id: string;
  follower: string;
  following: string;
  status: 'pending' | 'accepted';
}

export interface FollowerItem {
  _id: string;
  follower: { _id: string; name: string; username: string };
  following: string;
  status: 'accepted';
}

export interface FollowingItem {
  _id: string;
  follower: string;
  following: { _id: string; name: string; username: string };
  status: 'accepted';
}

export interface PendingRequest {
  _id: string;
  follower: { _id: string; name: string; username: string; bio?: string };
  status: 'pending';
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class FollowService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  followUser(userId: string): Observable<FollowResponse> {
    return this.http
      .post<{ data: { data: FollowResponse } }>(`${this.api}/users/${userId}/follow`, {})
      .pipe(map((res) => res.data.data));
  }

  unfollowUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/users/${userId}/unfollow`);
  }

  acceptFollowRequest(followId: string): Observable<FollowResponse> {
    return this.http
      .patch<{ data: { data: FollowResponse } }>(`${this.api}/follow/${followId}/accept`, {})
      .pipe(map((res) => res.data.data));
  }

  rejectFollowRequest(followId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/follow/${followId}/reject`);
  }

  getFollowers(userId: string): Observable<FollowerItem[]> {
    return this.http
      .get<{ data: { data: FollowerItem[] } }>(`${this.api}/users/${userId}/followers`)
      .pipe(map((res) => res.data.data));
  }

  getFollowing(userId: string): Observable<FollowingItem[]> {
    return this.http
      .get<{ data: { data: FollowingItem[] } }>(`${this.api}/users/${userId}/following`)
      .pipe(map((res) => res.data.data));
  }

  getPendingRequests(): Observable<PendingRequest[]> {
    return this.http
      .get<{ data: { data: PendingRequest[] } }>(`${this.api}/follow/requests`)
      .pipe(map((res) => res.data.data));
  }
}
