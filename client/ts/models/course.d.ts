import Section = require('./section');


declare class Course {
  id: number;
  selected: boolean;
  sections: Section[];

  constructor(courseJson: Object);
  static parse(courseJson: Object): Course;
}

export = Course;
