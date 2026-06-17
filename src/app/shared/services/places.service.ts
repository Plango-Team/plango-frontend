import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, of, timer } from 'rxjs';
import { catchError, distinctUntilChanged, finalize, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type PlaceCategory = 'office' | 'cafe' | 'venue' | 'home' | 'park' | 'other';

export interface Place {
  id: string;
  name: string;
  area?: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  distanceKm?: number;
  createdAt: number;
}

interface NominatimAddress {
  amenity?: string;
  building?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  country?: string;
  country_code?: string;
}

interface NominatimPlace {
  place_id: number;
  osm_type?: string;
  osm_id?: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  category?: string;
  type?: string;
  addresstype?: string;
  address?: NominatimAddress;
}

@Injectable({ providedIn: 'root' })
export class PlacesService {
  private http = inject(HttpClient);
  private nominatimUrl = environment.nominatimUrl ?? 'https://nominatim.openstreetmap.org';
  private lastNominatimRequestAt = 0;
  private readonly minRequestGapMs = 1100;

  private savedPlaces: Place[] = [];
  private searchCache = new Map<string, Place[]>();
  private reverseCache = new Map<string, Place | null>();

  private searchQuery$ = new Subject<string>();
  private _results$ = new BehaviorSubject<Place[]>([]);
  results$ = this._results$.asObservable();
  isSearching$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.searchQuery$
      .pipe(
        map((query) => query.trim()),
        distinctUntilChanged(),
        switchMap((query) => {
          if (query.length < 2) {
            return of(this.getSavedPlaces().slice(0, 8));
          }

          this.isSearching$.next(true);
          return this.geocode(query).pipe(
            catchError(() => of([] as Place[])),
            finalize(() => this.isSearching$.next(false)),
          );
        }),
      )
      .subscribe((results) => this._results$.next(results));
  }

  search(query: string): void {
    this.searchQuery$.next(query);
  }

  geocode(query: string, limit = 8): Observable<Place[]> {
    const normalized = this.normalizeQuery(query);
    if (!normalized) return of([]);

    const cacheKey = `${normalized}:${limit}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached) return of(cached);

    return this.withNominatimLimit(() =>
      this.http
        .get<NominatimPlace[]>(`${this.nominatimUrl}/search`, {
          params: {
            q: normalized,
            format: 'jsonv2',
            addressdetails: '1',
            limit: String(limit),
            'accept-language': 'ar,en',
          },
        })
        .pipe(
          map((results) => results.map((item) => this.nominatimToPlace(item))),
          map((places) => {
            this.searchCache.set(cacheKey, places);
            return places;
          }),
        ),
    );
  }

  reverseGeocode(lat: number, lng: number): Observable<Place | null> {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return of(null);

    const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (this.reverseCache.has(cacheKey)) return of(this.reverseCache.get(cacheKey) ?? null);

    return this.withNominatimLimit(() =>
      this.http
        .get<NominatimPlace>(`${this.nominatimUrl}/reverse`, {
          params: {
            lat: String(lat),
            lon: String(lng),
            format: 'jsonv2',
            addressdetails: '1',
            zoom: '18',
            'accept-language': 'ar,en',
          },
        })
        .pipe(
          map((result) => {
            const place = this.nominatimToPlace(result);
            this.reverseCache.set(cacheKey, place);
            this.savePlace(place);
            return place;
          }),
          catchError(() => {
            this.reverseCache.set(cacheKey, null);
            return of(null);
          }),
        ),
    );
  }

  resolvePlace(name: string): Observable<Place | null> {
    const trimmed = name.trim();
    if (!trimmed) return of(null);

    const saved = this.findByName(trimmed);
    if (saved && this.hasUsableCoordinates(saved)) return of(saved);

    return this.geocode(trimmed, 1).pipe(
      map((places) => {
        const place = places[0] ?? null;
        if (place) this.savePlace(place);
        return place;
      }),
      catchError(() => of(null)),
    );
  }

  savePlace(place: Place): void {
    const existingIndex = this.savedPlaces.findIndex(
      (p) => p.id === place.id || p.name.toLowerCase() === place.name.toLowerCase(),
    );

    if (existingIndex >= 0) {
      this.savedPlaces = [
        place,
        ...this.savedPlaces.filter((_, index) => index !== existingIndex),
      ];
      return;
    }

    this.savedPlaces = [place, ...this.savedPlaces];
  }

  findOrCreate(name: string): Place {
    const trimmed = name.trim();
    const found = this.findByName(trimmed);
    if (found) return found;

    const newPlace: Place = {
      id: 'local_' + Math.random().toString(36).slice(2, 8),
      name: trimmed,
      category: 'other',
      lat: 0,
      lng: 0,
      createdAt: Date.now(),
    };
    this.savedPlaces = [newPlace, ...this.savedPlaces];
    return newPlace;
  }

  findByName(name: string): Place | undefined {
    const normalized = name.trim().toLowerCase();
    return this.savedPlaces.find((p) => p.name.toLowerCase() === normalized);
  }

  getSavedPlaces(): Place[] {
    return this.savedPlaces;
  }

  getSavedMatches(query: string): Place[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return this.savedPlaces.slice(0, 8);

    return this.savedPlaces
      .filter(
        (place) =>
          place.name.toLowerCase().includes(normalized) ||
          place.area?.toLowerCase().includes(normalized),
      )
      .slice(0, 8);
  }

  calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  private withNominatimLimit<T>(request: () => Observable<T>): Observable<T> {
    const now = Date.now();
    const waitMs = Math.max(0, this.minRequestGapMs - (now - this.lastNominatimRequestAt));
    this.lastNominatimRequestAt = now + waitMs;
    return timer(waitMs).pipe(switchMap(request));
  }

  private nominatimToPlace(item: NominatimPlace): Place {
    const address = item.address ?? {};
    const firstDisplayPart = item.display_name.split(',')[0]?.trim();
    const name = item.name || address.amenity || address.building || address.road || firstDisplayPart;
    const areaParts = [
      address.neighbourhood || address.suburb,
      address.city || address.town || address.village || address.county,
      address.state,
      address.country,
    ].filter(Boolean);

    return {
      id: this.placeId(item),
      name: name || item.display_name,
      area: areaParts.length ? areaParts.join(', ') : this.displayArea(item.display_name),
      category: this.mapCategory(item.category, item.type, item.addresstype),
      lat: Number(item.lat),
      lng: Number(item.lon),
      createdAt: Date.now(),
    };
  }

  private placeId(item: NominatimPlace): string {
    if (item.osm_type && item.osm_id) {
      return `osm_${item.osm_type}_${item.osm_id}`;
    }

    return `nominatim_${item.place_id}`;
  }

  private displayArea(displayName: string): string | undefined {
    const parts = displayName
      .split(',')
      .slice(1, 4)
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length ? parts.join(', ') : undefined;
  }

  private mapCategory(...values: (string | undefined)[]): PlaceCategory {
    const source = values.filter(Boolean).join(' ').toLowerCase();
    if (!source) return 'other';
    if (source.includes('office') || source.includes('business') || source.includes('commercial')) {
      return 'office';
    }
    if (
      source.includes('cafe') ||
      source.includes('restaurant') ||
      source.includes('food') ||
      source.includes('shop')
    ) {
      return 'cafe';
    }
    if (source.includes('park') || source.includes('garden')) return 'park';
    if (
      source.includes('venue') ||
      source.includes('entertainment') ||
      source.includes('stadium') ||
      source.includes('theatre')
    ) {
      return 'venue';
    }
    if (source.includes('house') || source.includes('residential')) return 'home';
    return 'other';
  }

  private normalizeQuery(query: string): string {
    return query.trim().replace(/\s+/g, ' ');
  }

  private hasUsableCoordinates(place: Place): boolean {
    return Number.isFinite(place.lat) && Number.isFinite(place.lng) && (place.lat !== 0 || place.lng !== 0);
  }
}
