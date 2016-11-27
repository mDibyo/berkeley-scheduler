import Section from '../models/section';


declare class Course {
  id: string;
  selected: boolean;
  sections: Section[];

  constructor(courseJson: Object);
  static parse(courseJson: Object): Course;
  add(): void;
  drop(): void;
}

export default Course;
