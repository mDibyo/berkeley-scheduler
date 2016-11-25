declare class Time {}

declare interface Days {
  [day: string]: boolean;
}

declare class Meeting {
  startTime: Time;
  endTime: Time;
  days: Days;
  location: string;
  instructors: string[];

  constructor(startTime: Time, endTime: Time, days: Days, location: string, instructors: string[]);
}

export = Meeting;

