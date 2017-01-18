import angular = require('angular');

import CourseInstance from './courseInstance';
import Meeting from './meeting';
import {Option, Commitment} from './commitment';


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


export default class Section implements Option {
  id: string;
  type: string;
  owner: CourseInstance;
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
      this.owner = courseInstance;
    }
    this.meetings = sectionJson.meetings.map(
        (meetingJson) => Meeting.parse(meetingJson, this)
    );
    this.selected = true;
  }
}
