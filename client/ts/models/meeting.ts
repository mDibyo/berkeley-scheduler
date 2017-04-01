import Time = require('./time');
import {Days, Identifiable, generateRandomAlphaNumericId, getDefaultDays} from '../utils';


export interface DaysJson {
  Mo: boolean;
  Tu: boolean;
  We: boolean;
  Th: boolean;
  Fr: boolean;
  Sa: boolean;
  Su: boolean;
}

const parseDays = (daysJson: DaysJson): Days<boolean> => ({
  'Monday': daysJson.Mo,
  'Tuesday': daysJson.Tu,
  'Wednesday': daysJson.We,
  'Thursday': daysJson.Th,
  'Friday': daysJson.Fr,
  'Saturday': daysJson.Sa,
  'Sunday': daysJson.Su
});


export interface MeetingJson {
  loc: {code: string, description: string};
  days: DaysJson;
  sT: string;
  eT: string;
  dayAbbrevs: string;
  instructors: {name: string, role: string}[];
}

export const MIDTERM_MEETING_LOCATION_CODE = 'MIDTERM';


declare interface Instructor {
  name: string
}

export default class Meeting<Owner> implements Identifiable {
  public id: string;

  constructor(
      public startTime: Time = Time.noon,
      public endTime: Time = Time.noon,
      public days: Days<boolean> = getDefaultDays<boolean>(() => false),
      public location: string = '',
      public instructors: Instructor[] = [],
      public owner: Owner
  ) {
    this.id = generateRandomAlphaNumericId(10);
  }

  static parse<Owner>(meetingJson: MeetingJson, owner: Owner): Meeting<Owner> {
    let location = undefined;
    if (meetingJson.loc) {
      location = meetingJson.loc.description || undefined;
    }

    if (meetingJson.sT === null || meetingJson.eT === null) {
      return new Meeting<Owner>(
          undefined, undefined, parseDays(meetingJson.days),
          location, meetingJson.instructors, owner
      );
    }
    const startTimeSplit = meetingJson.sT.split(':');
    const startTime = new Time(parseInt(startTimeSplit[0]), parseInt(startTimeSplit[1]));
    const endTimeSplit = meetingJson.eT.split(':');
    const endTime = new Time(parseInt(endTimeSplit[0]), parseInt(endTimeSplit[1]));

    return new Meeting<Owner>(
        startTime, endTime, parseDays(meetingJson.days),
        location, meetingJson.instructors, owner
    );
  };

  static withOwner<Owner>(meeting: Meeting<any>, owner: Owner) {
    return new Meeting<Owner>(
        meeting.startTime,
        meeting.endTime,
        meeting.days,
        meeting.location,
        meeting.instructors,
        owner
    )
  }

  static dayAbbrevs = [
    ['Monday', 'M'],
    ['Tuesday', 'T'],
    ['Wednesday', 'W'],
    ['Thursday', 'R'],
    ['Friday', 'F']
  ];

  getTotalMinutes(): number {
    return this.endTime.getTotalMinutes() - this.startTime.getTotalMinutes();
  };

  getDayList(): string[] {
    return Object.keys(this.days).filter(function (day) {
      return this.days[day];
    }, this);
  };

  toString() {
    let dayAbbrev = '';
    Meeting.dayAbbrevs.forEach(function (day) {
      if (this.days[day[0]]) {
        dayAbbrev += day[1];
      }
    }, this);
    if (this.startTime == null || this.endTime == null) {
      return dayAbbrev;
    }
    return dayAbbrev + ' ' + this.startTime.toString() + ' - ' + this.endTime.toString();
  };
}
