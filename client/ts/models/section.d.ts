declare class Course {}

import Meeting = require('./meeting');

declare class Section {
  id: string;
  course: Course;
  selected: boolean;
  meetings: Meeting[];

  constructor(sectionJson: Object, course: Course);
}

export default Section;
