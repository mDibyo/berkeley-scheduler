import Section, {SectionJson} from './section';
import CourseInstance from './courseInstance';
import {Identifiable, ColorRegisterableIdentifiable, StringMap} from '../utils';
import {CourseInstanceJson} from "./courseInstance";


export type CourseJson = CourseInstanceJson[];


export default class Course extends ColorRegisterableIdentifiable implements Identifiable {
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
    super();

    const courseInfo: CourseInstanceJson = courseJson[0];

    if (courseInfo.displayName === undefined) {
      console.log(courseJson);
    }

    [this.department, this.courseNumber] = courseInfo.displayName.split(' ', 2);
    this.title = courseInfo.title;
    this.description = courseInfo.description;
    this.id = courseInfo.id;
    this.units = courseInfo.units;

    this.instances = courseJson.map((ciJson: CourseInstanceJson) => {
      const sectionsMap: StringMap<Section> = {};

      let section: Section = new Section(ciJson.sections[0]);
      const sectionList: Section[] = ciJson.sections.map((sectionJson: SectionJson) => {
        section = new Section(sectionJson);
        sectionsMap[section.id] = section;
        return section;
      });
      const primarySection: Section = sectionsMap[sectionList[0].associatedPrimarySectionId];
      return new CourseInstance(this, primarySection, sectionList, ciJson.finalExam);
    });
  }

  static parse(courseJson: CourseJson): Course {
    return new Course(courseJson);
  }

  getName(): string {
    return `${this.department} ${this.courseNumber}`;
  }
}
