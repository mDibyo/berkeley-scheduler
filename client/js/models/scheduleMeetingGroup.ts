'use strict';

import Meeting = require('./meeting');

export class MeetingView {
  group: ScheduleMeetingGroup;
  day: string;
  slotIdx: number;

  private _meeting: Meeting;

  constructor(meetingGroup: ScheduleMeetingGroup, meeting: Meeting, day: string, slotIdx: number = -1) {
    this.group = meetingGroup;
    this._meeting = meeting;
    this.day = day;
    this.slotIdx = slotIdx;
  }

  get startTime(): any {
    return this._meeting.startTime;
  }

  get endTime(): any {
    return this._meeting.endTime;
  }

  get location(): string {
    return this._meeting.location;
  }

  get instructors(): string[] {
    return this._meeting.instructors;
  }
}

export default class ScheduleMeetingGroup {
  day: string;
  slots: MeetingView[][];

  constructor(meeting: Meeting, day: string) {
    this.day = day;
    this.slots = [];
    this.add(meeting);
  }

  hasOverlap(meeting: Meeting) {
    const meetingView = new MeetingView(this, meeting, this.day);
    for (let j = 0; j < this.slots.length; j++) {
      const slot = this.slots[j];
      if (slot[slot.length - 1].endTime.compareTo(meetingView.startTime) > 0) {
        return true;
      }
    }
    return false;
  }

  add(meeting: Meeting) {
    const meetingView = new MeetingView(this, meeting, this.day);
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (slot[slot.length - 1].endTime.compareTo(meetingView.startTime) < 0) {
        slot.push(meetingView);
        meetingView.slotIdx = i;
        return;
      }
    }
    this.slots.push([meetingView]);
    meetingView.slotIdx = this.slots.length - 1;
  }
}
