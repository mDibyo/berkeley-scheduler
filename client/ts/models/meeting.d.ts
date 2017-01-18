import Time = require('./time');
import {Days} from '../utils';

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
      owner?: Owner
  )
  static parse<Owner>(meetingJson: Object, owner: Owner): Meeting<Owner>;
  getTotalMinutes(): number
}

export = Meeting;
