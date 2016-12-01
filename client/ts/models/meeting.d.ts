import Time = require('./time');

declare interface Days {
  [day: string]: boolean;
}

declare interface Instructor {
  name: string
}

declare class Meeting<Owner> {
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

export = Meeting;

