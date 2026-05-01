export interface IAppointment {
  id: string;
  title: string;
  lat: number;
  lng: number;
  description?: string;
}

export interface IRouteResponse {
  success: boolean;
  data: {
    transport_mode: 'car' | 'publicTransport' | 'walk';
    duration: number;
    distance: number;
    polyline: string;
    steps?: IRouteStep[];
  };
}

export interface IRouteStep {
  type: 'walk' | 'bus' | 'train';
  duration: number;
  line?: string;
}