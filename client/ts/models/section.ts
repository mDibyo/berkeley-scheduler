import angular = require('angular');

import CourseInstance from './courseInstance';
import Meeting, {MeetingJson, MIDTERM_MEETING_LOCATION_CODE} from "./meeting";
import {Option} from './commitment';


export interface EnrollmentJson {
  eCurr: number;
  eMin: number;
  eMax: number;
  wCurr: number;
  wMax: number;
}


export interface SectionJson {
  id: string;
  type: string;
  number: string;

  isPri: boolean;
  assocPriSecId: number;

  enrollment: EnrollmentJson;

  meetings: MeetingJson[];
}


export default class Section implements Option {
  id: string;
  type: string;
  owner: CourseInstance;
  number: string;

  isPrimary: boolean;

  enrolled: number;
  enrollCapacity: number;
  waitlisted: number;
  waitlistCapacity: number;

  selected: boolean;

  meetings: Meeting<Section>[];

  constructor(sectionJson: SectionJson, courseInstance?: CourseInstance) {
    this.id = sectionJson.id;
    this.type = sectionJson.type;
    this.number = sectionJson.number;

    this.isPrimary = sectionJson.isPri;

    if (courseInstance) {
      this.owner = courseInstance;
    }

    this.enrolled = sectionJson.enrollment.eCurr;
    this.enrollCapacity = sectionJson.enrollment.eMax;
    this.waitlisted = sectionJson.enrollment.wCurr;
    this.waitlistCapacity = sectionJson.enrollment.wMax;

    this.meetings = sectionJson.meetings
        .filter((meetingJson: MeetingJson) => meetingJson.loc.code !== MIDTERM_MEETING_LOCATION_CODE)
        .map(meetingJson => Meeting.parse(meetingJson, this));
    this.selected = true;
  }
}
