import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

// ─── Types ───────────────────────────────────────────────────────
export type AccountKind = 'user' | 'org';

export interface Profile {
  id: string;
  kind: AccountKind;
  username: string;
  displayName: string;
  bio?: string;
  city?: string;
  privateFollows?: boolean;
  createdAt: number;
}

export interface FollowEdge {
  id?: string;
  followerId: string;
  followeeId: string;
  status: 'pending' | 'approved';
  createdAt: number;
}

export interface Post {
  id?: string;
  authorId: string;
  body: string;
  eventId?: string;
  likes: string[];
  createdAt: number;
}

// ─── Service ─────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class SocialService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  // ── Profiles ──
  getProfiles(): Observable<Profile[]> {
    return this.http.get<Profile[]>(`${this.api}/profiles`);
  }

  createProfile(profile: Profile): Observable<Profile> {
    return this.http.post<Profile>(`${this.api}/profiles`, profile);
  }

  updateProfile(profile: Profile): Observable<Profile> {
    return this.http.put<Profile>(`${this.api}/profiles/${profile.id}`, profile);
  }

  // ── Posts ──
  getPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.api}/posts`);
  }

  createPost(post: Post): Observable<Post> {
    return this.http.post<Post>(`${this.api}/posts`, post);
  }

  updatePost(post: Post): Observable<Post> {
    return this.http.put<Post>(`${this.api}/posts/${post.id}`, post);
  }

  deletePost(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/posts/${id}`);
  }

  // ── Follows ──
  getFollows(): Observable<FollowEdge[]> {
    return this.http.get<FollowEdge[]>(`${this.api}/follows`);
  }

  createFollow(edge: FollowEdge): Observable<FollowEdge> {
    return this.http.post<FollowEdge>(`${this.api}/follows`, edge);
  }

  updateFollow(edge: FollowEdge): Observable<FollowEdge> {
    return this.http.put<FollowEdge>(`${this.api}/follows/${edge.id}`, edge);
  }

  deleteFollow(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/follows/${id}`);
  }

  // ── All at once ──
  loadAll(): Observable<{ profiles: Profile[]; posts: Post[]; follows: FollowEdge[] }> {
    return forkJoin({
      profiles: this.getProfiles(),
      posts: this.getPosts(),
      follows: this.getFollows(),
    });
  }
}
