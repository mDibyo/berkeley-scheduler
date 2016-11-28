declare class Course {}

import Meeting from './meeting';


declare class Section {
  id: string;
  type: string;
  course: Course;
  number: string;

  enrolled: number;
  enrollCapacity: number;
  waitlisted: number;
  waitlistCapacity: number;

  selected: boolean;

  meetings: Meeting[];

  constructor(sectionJson: Object, course: Course);
}

export default Section;
