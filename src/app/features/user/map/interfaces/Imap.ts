export interface MapState {
  userLocation: {
    lng: number;
    lat: number;
  } | null;
  currentRoute: number[][] | null;
  isLoading: boolean;
  error: string | null;
  userHeading: number | null;
}
