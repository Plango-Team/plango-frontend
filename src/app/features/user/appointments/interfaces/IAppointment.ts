export interface Appointment {
    _id:                 string;
    title:               string;
    description:         string;
    userId:              string;
    eventId:             null;
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
    fullAddres?: string;
    type:        string;
    coordinates: number[];
}

export interface AppointmentResponce {
    status: string;
    message: string;
    data:{
        appointment : Appointment
    }
}
