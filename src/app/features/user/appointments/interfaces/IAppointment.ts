export interface Appointment {
    _id:                 string;
    title:               string;
    description:         string;
    userId:              string | {
      _id: string;
      name?: string;
      username?: string;
    };
    eventId:             string | null;
    transportation:      string;
    estimatedTravelTime: number;
    arrivalTime:         Date;
    actualDepartureTime: Date;
    startLocation:       Location;
    destinationLocation: Location;
    isRecurring:         boolean;
    repeatType:          null;
    repeatUntil:         null;
    recurrenceId:        null;
    startedTrip:         boolean;
    polyline:            string;
    stepsCount:          null;
    caloriesBurned:      null;
    distanceInMeters:    number;
    arrivalBuffer:       number;
    preparationTime:     number;
    isCompleted:         boolean;
    Status:              string;
    travelHours:         number;
    participants?:       Array<{
      receiverId?: {
        _id: string;
        name: string;
        username: string;
      };
    }>;
}

export interface AppointmentPayload {
    title:               string;
    description?:         string;
    transportation:      string;
    arrivalTime:         Date;
    startLocation:       Location;
    destinationLocation: Location;
    actualDepartureTime?: string;
    arrivalBuffer?:       number;
    preparationTime?:     number;
    isRecurring?:         boolean;
}
export interface Location {
    addressName: string;
    fullAddress?: string;
    fullAddres?: string;
    type:        string;
    coordinates: number[];
    placeId?: string;
}

export interface AppointmentResponce {
    status: string;
    message: string;
    data:{
        appointment : Appointment
    }
}
