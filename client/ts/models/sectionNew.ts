import angular = require('angular');

import CourseInstance from './courseInstance';
import {Meeting} from './meeting';


export interface SectionJson {
  id: string;
  type: string;
  number: string;

  enrolled: number;
  enrollCapacity: number;
  waitlisted: number;
  waitlistCapacity: number;

  meetingJsons: Object[];
}


export default class Section {
  id: string;
  type: string;
  courseInstance: CourseInstance;
  number: string;

  enrolled: number;
  enrollCapacity: number;
  waitlisted: number;
  waitlistCapacity: number;

  selected: boolean;

  meetings: Meeting<Section>[];

  constructor(sectionJson: SectionJson, courseInstance?: CourseInstance) {
    angular.extend(this, sectionJson);

    if (courseInstance) {
      this.courseInstance = courseInstance;
    }
    this.meetings = sectionJson.meetingJsons.map(
        (meetingJson) => Meeting.parse(meetingJson, this)
    );
    this.selected = true;
  }
}
