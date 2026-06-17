import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export type AccountKind = 'user' | 'org';
export type FollowStatus = 'none' | 'pending' | 'accepted';

export interface Profile {
  id: string;
  kind: AccountKind;
  username: string;
  displayName: string;
  bio?: string;
  city?: string;
  isPrivate: boolean;
  createdAt: number;
  followersCount?: number;
  followingCount?: number;
  followStatus?: FollowStatus;
  limitedProfile?: boolean;
}

export interface FollowEdge {
  id?: string;
  followerId: string;
  followeeId: string;
  status: 'pending' | 'approved';
  createdAt: number;
}

export interface Post {
  id: string;
  authorId: string;
  body: string;
  likes: string[];
  likeCount: number;
  createdAt: number;
  updatedAt?: number;
}

export interface PostsPage {
  posts: Post[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface LikeResult {
  liked: boolean;
  totalLikes: number;
}

interface BackendUser {
  _id: string;
  name: string;
  username: string;
  role?: 'user' | 'org' | 'admin';
  bio?: string;
  location?: string;
  isPrivate?: boolean;
  createdAt?: string;
  followersCount?: number;
  followingCount?: number;
  followStatus?: FollowStatus;
  limitedProfile?: boolean;
}

interface BackendPost {
  _id?: string;
  id?: string;
  content: string;
  userId: string | { _id: string; name?: string; username?: string; role?: string };
  likes?: Array<string | { _id: string }>;
  likeCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse<T> {
  status: string;
  message?: string;
  data: T;
}

export const profileFromBackend = (user: BackendUser): Profile => ({
  id: user._id,
  kind: user.role === 'org' ? 'org' : 'user',
  username: user.username,
  displayName: user.name,
  bio: user.bio,
  city: user.location,
  isPrivate: user.isPrivate ?? false,
  createdAt: user.createdAt ? new Date(user.createdAt).getTime() : Date.now(),
  followersCount: user.followersCount,
  followingCount: user.followingCount,
  followStatus: user.followStatus,
  limitedProfile: user.limitedProfile,
});

export const postFromBackend = (post: BackendPost): Post => {
  const authorId = typeof post.userId === 'string' ? post.userId : post.userId._id;
  const likes = (post.likes ?? []).map((like) => (typeof like === 'string' ? like : like._id));

  return {
    id: post._id ?? post.id ?? '',
    authorId,
    body: post.content,
    likes,
    likeCount: post.likeCount ?? likes.length,
    createdAt: post.createdAt ? new Date(post.createdAt).getTime() : Date.now(),
    updatedAt: post.updatedAt ? new Date(post.updatedAt).getTime() : undefined,
  };
};

@Injectable({ providedIn: 'root' })
export class SocialService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  getProfiles(): Observable<Profile[]> {
    return this.http
      .get<{ data: { users: BackendUser[] } }>(`${this.api}/users`)
      .pipe(
        map((response) =>
          response.data.users
            .filter((user) => user.role !== 'admin')
            .map(profileFromBackend),
        ),
      );
  }

  getProfile(userId: string): Observable<Profile> {
    return this.http
      .get<{ data: { user: BackendUser } }>(`${this.api}/users/${userId}/profile`)
      .pipe(map((response) => profileFromBackend(response.data.user)));
  }

  searchUsers(query: string): Observable<Profile[]> {
    const params = new HttpParams().set('search', query.trim());
    return this.http
      .get<{ data: { users: BackendUser[] } }>(`${this.api}/users/search`, { params })
      .pipe(map((response) => response.data.users.map(profileFromBackend)));
  }

  updateProfile(profile: Profile): Observable<Profile> {
    return this.http
      .put<ApiResponse<{ user: BackendUser }>>(`${this.api}/users/updateMe`, {
        name: profile.displayName,
        bio: profile.bio,
        location: profile.city,
        isPrivate: profile.isPrivate,
      })
      .pipe(map((response) => profileFromBackend(response.data.user)));
  }

  getPosts(page = 1, limit = 20): Observable<PostsPage> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http
      .get<ApiResponse<{
        posts: BackendPost[];
        total: number;
        page: number;
        limit: number;
        pages: number;
      }>>(`${this.api}/posts`, { params })
      .pipe(
        map((response) => ({
          ...response.data,
          posts: response.data.posts.map(postFromBackend),
        })),
      );
  }

  createPost(content: string): Observable<Post> {
    return this.http
      .post<ApiResponse<{ post: BackendPost }>>(`${this.api}/posts`, { content })
      .pipe(map((response) => postFromBackend(response.data.post)));
  }

  toggleLike(postId: string): Observable<LikeResult> {
    return this.http
      .patch<ApiResponse<{ result: LikeResult }>>(`${this.api}/posts/${postId}/like`, {})
      .pipe(map((response) => response.data.result));
  }

  deletePost(id: string): Observable<void> {
    return this.http.delete(`${this.api}/posts/${id}`).pipe(map((): void => void 0));
  }
}
