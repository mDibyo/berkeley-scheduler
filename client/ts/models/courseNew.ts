import Section, {SectionJson} from './sectionNew';
import CourseInstance from './courseInstance';
import {Identifiable} from '../utils';


interface CourseJson {
  id: string;
  displayName: string;
  title: string;
  description: string;
  units: number;
  meetings: Object[];
  sections: SectionJson[];
}

export default class Course implements Identifiable {
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

    const primarySections: Section[] = [];
    const sectionsByPrimarySectionId: {[id: string]: Section[]} = {};
    courseJson.sections.forEach(sectionJson => {
      const section = new Section(sectionJson);

      if (section.isPrimary) {
        primarySections.push(section);
      } else {
        const primarySectionId = section.associatedPrimarySectionId;
        if (!sectionsByPrimarySectionId[primarySectionId]) {
          sectionsByPrimarySectionId[primarySectionId] = [];
        }
        sectionsByPrimarySectionId[primarySectionId].push(section);
      }
    });
    this.instances = primarySections.map(
        primarySection => new CourseInstance(
            this,
            primarySection,
            sectionsByPrimarySectionId[primarySection.id] || []
        )
    );
  }

  static parse(courseJson: CourseJson): Course {
    return new Course(courseJson);
  }

  getName(): string {
    return `${this.department} ${this.courseNumber}`;
  }

  add() {
    this.instances.forEach(instance => instance.add());
  }

  drop() {
    this.instances.forEach(instance => instance.drop());
  }
}
