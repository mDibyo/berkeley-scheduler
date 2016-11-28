import Time = require('./time');

declare interface Days {
  [day: string]: boolean;
}

export declare interface Instructor {
  name: string
}

export declare class Meeting<Owner> {
  startTime: Time;
  endTime: Time;
  days: Days;
  location: string;
  instructors: Instructor[];
  owner: Owner;

  constructor(
      startTime: Time,
      endTime: Time,
      days: Days,
      location: string,
      instructors: Instructor[],
      owner: Object
  )
  static parse<Owner>(meetingJson: Object, owner: Owner): Meeting<Owner>;
  getTotalMinutes(): number
}

export default Meeting;

