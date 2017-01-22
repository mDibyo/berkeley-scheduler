'use strict';

import Meeting from './meeting';
import ScheduleMeetingGroup from './scheduleMeetingGroup';
import {Identifiable, Days, getDefaultDays, StringMap, generateIdFromIds} from '../utils';
import {Option} from './commitment';
import CourseInstance from './courseInstance';


export type TimeFootprint = string;

export default class Schedule implements Identifiable {
  static timeFootprints: {[footprint: string]: Days<Meeting<Option>[]>} = {};

  id: string;
  selected: boolean = true;
  courseInstances: StringMap<CourseInstance> = {};
  meetingsByDay: Days<Meeting<Option>[]> = getDefaultDays<Meeting<Option>[]>(() => []);

  private _hasNoTimeConflicts: boolean|null = null;
  private _meetingGroupsByDay: Days<ScheduleMeetingGroup[]|undefined>
      = getDefaultDays<undefined>(() => undefined);

  constructor(userId: string, sections: Option[]) {
    const sectionIdList: string[] = [];
    sections.forEach(function (section) {
      sectionIdList.push(section.id);
      const courseInstanceId = section.owner.id;
      if (!this.courseInstances.hasOwnProperty(courseInstanceId)) {
        this.courseInstances[courseInstanceId] = [];
      }
      this.courseInstances[courseInstanceId].push(section);

      section.meetings.forEach(function (meeting) {
        meeting.owner = section;
        meeting.getDayList().forEach(function (day) {
          this.meetingsByDay[day].push(meeting);
        }, this);
      }, this);
    }, this);
    for (let day in this.meetingsByDay) {
      this.meetingsByDay[day].sort(function (a, b) {
        return a.startTime.compareTo(b.startTime) * 1440 + a.endTime.compareTo(b.endTime);
      });
    }

    this.id = generateIdFromIds(userId, sectionIdList);

    this._hasNoTimeConflicts = null;
  }

  getTimeFootprint(): TimeFootprint {
    const footprint = Meeting.dayAbbrevs.map(dayAbbrev => {
      return dayAbbrev[1] +
          this.meetingsByDay[dayAbbrev[0]].map((meeting) => {
            return meeting.startTime.getTotalMinutes() + '-' + meeting.endTime.getTotalMinutes();
          }).reduce((a, b) => a + '.' + b, '');
    }).reduce((a, b) => a + '|' + b, '');
    Schedule.timeFootprints[footprint] = this.meetingsByDay;
    return footprint;
  };

  hasNoTimeConflicts() {
    if (this._hasNoTimeConflicts === null) {
      this._hasNoTimeConflicts = this._calculateHasNoTimeConflicts();
    }
    return this._hasNoTimeConflicts;
  };

  _calculateHasNoTimeConflicts() {
    for (let day in this.meetingsByDay) {
      const meetingGroups = this.getMeetingGroupsForDay(day);
      for (let i = 0; i < meetingGroups.length; i++) {
        if (meetingGroups[i].slots.length > 1) {
          return false;
        }
      }
    }
    return true;
  };

  getMeetingGroupsForDay(day: string): ScheduleMeetingGroup[] {
    let meetingGroup = this._meetingGroupsByDay[day];
    if (!meetingGroup) {
      meetingGroup = this._meetingGroupsByDay[day] = this._generateMeetingGroupsForDay(day);
    }
    return meetingGroup;
  };

  _generateMeetingGroupsForDay(day: string): ScheduleMeetingGroup[] {
    if (!this.meetingsByDay[day].length) {
      return [];
    }

    const meetings = this.meetingsByDay[day];
    const meetingGroups: ScheduleMeetingGroup[] = [];
    let currMeetingGroup = new ScheduleMeetingGroup(meetings[0], day);
    for (let i = 1; i < meetings.length; i++) {
      const meeting = meetings[i];
      if (currMeetingGroup.hasOverlap(meeting)) {
        currMeetingGroup.add(meeting);
      } else {
        meetingGroups.push(currMeetingGroup);
        currMeetingGroup = new ScheduleMeetingGroup(meeting, day);
      }
    }
    meetingGroups.push(currMeetingGroup);
    return meetingGroups;
  };

  static normalizeId(id: string|null): string|null {
    if (id === null) {
      return null;
    }

    const [userId, ...idComponents] = id.split('.');
    return generateIdFromIds(userId, idComponents);
  };

  static getUserIdFromId(id: string): string {
    return id.split('.')[0];
  };

  static getOptionIdsFromId(id: string): string[] {
    return id.split('.').slice(1);
  };
}
