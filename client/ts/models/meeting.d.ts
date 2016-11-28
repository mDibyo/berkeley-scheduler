import Time = require('./time');

declare interface Days {
  [day: string]: boolean;
}

export declare interface Instructor {
  name: string
}

export declare class Meeting {
  startTime: Time;
  endTime: Time;
  days: Days;
  location: string;
  instructors: Instructor[];
  owner: Object;

  constructor(
      startTime: Time,
      endTime: Time,
      days: Days,
      location: string,
      instructors: Instructor[],
      owner: Object
  )
  getTotalMinutes(): number
}

export default Meeting;

