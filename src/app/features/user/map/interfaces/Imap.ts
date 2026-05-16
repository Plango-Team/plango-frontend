export interface IAppointment {
  id: string;
  title: string;
  lat: number;
  lng: number;
  transport_mode: 'car' | 'publicTransport' | 'walk';
  states:string;
  description?: string;
  appointmenttime:string
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

export interface ChatMessage {
  id: number;
  sender: string;
  text: string;
  time: string;
}
export interface Friend {
  id:number
  name: string;
  late: number;
  arrive: number;
  distance: number;
  states: string;
  transport_mode: string;
  lat:number;
  lng:number;
}
export interface ITrip {
  id:number;
  tripTitle: string;
  location:string;
  lat:number;
  lng:number;
  startTime:string;
  remainingTime:number;
  arrivalTime:string;
  appointmentTime : string;
  chatMessages: ChatMessage[];
  showTripMenu: boolean;
}

export interface MapState {
  userLocation: {
    lng: number;
    lat: number
  } | null;
  appointments: IAppointment[] | null;
  currentRoute: number[][] | null;
  routeData: IRouteResponse | null;
  isLoading: boolean;
  error: string | null;
  userHeading : number | null;
  events:any[] | null; // مؤقت
  trips:ITrip[] | null,
  friends: Friend[]; 
}