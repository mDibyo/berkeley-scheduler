import angular = require('angular');

import CourseInstance from './courseInstance';
import Meeting = require('./meeting');


export interface SectionJson {
  id: string;
  type: string;
  number: string;

  isPrimary: boolean;
  associatedPrimarySectionId: number;

  enrolled: number;
  enrollCapacity: number;
  waitlisted: number;
  waitlistCapacity: number;

  meetings: Object[];
}


export default class Section {
  id: string;
  type: string;
  courseInstance: CourseInstance;
  number: string;

  isPrimary: boolean;
  associatedPrimarySectionId: number;

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
    this.meetings = sectionJson.meetings.map(
        (meetingJson) => Meeting.parse(meetingJson, this)
    );
    this.selected = true;
  }
}
