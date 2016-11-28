import Section from './section';
import CourseInstance from './courseInstance';

interface CourseJson {
  id: string;
  displayName: string;
  title: string;
  description: string;
  units: number;
  meetings: Object[];
  sections: Object[];
}

export default class Course {
  id: string;
  department: string;
  courseNumber: string;
  title: string;
  description: string;
  units: number;

  selected: boolean = false;
  color: string;

  instances: CourseInstance[];

  constructor(courseJson: CourseJson) {
    if (courseJson.displayName === undefined) {
      console.log(courseJson);
    }

    [this.department, this.courseNumber] = courseJson.displayName.split(' ', 2);
    this.title = courseJson.title;
    this.description = courseJson.description;
    this.id = courseJson.id;
    this.units = courseJson.units;

    /**
     * Divide into sections
     */
    const allSections =
        courseJson.sections.map((sectionJson) => new Section(sectionJson, this));
    // Find number of primary sections from section number
    const primarySections = allSections.filter(
        (section: Section) => section.number[0] === '0'
    );
    this.instances = primarySections.map((pSection) => {
      const instanceIdentifier: string = parseInt(pSection.number).toString();
      const sections: Section[] = allSections.filter((section: Section) => {
        return section.number.indexOf(instanceIdentifier) === 0;
      });
      return new CourseInstance(this, pSection, sections);
    })
  }

  static parse(courseJson: CourseJson): Course {
    return new Course(courseJson);
  }

  getName(): string {
    return `${this.department} ${this.courseNumber}`;
  }

  add() {
    this.instances.forEach((instance) => instance.add());
  }

  drop() {
    this.instances.forEach((instance) => instance.drop());
  }
}
