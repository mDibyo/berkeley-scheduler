import CourseInstance from './courseInstance';
import Meeting from './meeting';
import {Identifiable} from '../utils';


declare class Section implements Identifiable {
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

  constructor(sectionJson: Object, courseInstance: CourseInstance);
}

export default Section;
