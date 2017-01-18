import Section from '../models/section';
import Meeting from './meeting';
import ScheduleMeetingGroup from './scheduleMeetingGroup';

declare interface DayMeetings {[id: string]: Meeting<Section>[]}
declare interface DayMeetingGroups {[id: string]: ScheduleMeetingGroup[]}

declare class Schedule {
  static timeFootprints: {[footprint: string]: DayMeetings};

  id: string;
  selected: boolean;
  courseInstances: {[id: string]: Section[]};
  meetingsByDay: DayMeetings;

  private _meetingGroupsByDay: DayMeetingGroups;

  constructor(userId: string, sections: Section[]);
  static getUserIdFromId(id: string): string;
  static getSectionIdsFromId(id: string): string[];
}

export = Schedule;
