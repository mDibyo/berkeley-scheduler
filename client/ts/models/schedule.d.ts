import Section from '../models/section';
import Meeting from './meeting';
import ScheduleMeetingGroup from './scheduleMeetingGroup';

declare interface DayMeetings {[id: string]: Meeting[]}
declare interface DayMeetingGroups {[id: string]: ScheduleMeetingGroup[]}

declare class Schedule {
  static timeFootprints: {[footprint: string]: DayMeetings};

  id: string;
  selected: boolean;
  courses: {[id: string]: Section[]};
  meetingsByDay: DayMeetings;

  private _meetingGroupsByDay: DayMeetingGroups;

  constructor(userId: string, sections: Section[]);
}

export = Schedule;
