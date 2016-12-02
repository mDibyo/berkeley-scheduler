import Section from './sectionNew';
import Course from './courseNew';
import Meeting = require('./meeting');


export default class CourseInstance {
  id: string;
  course: Course;

  primarySection: Section;
  secondarySections: Section[];
  sections: Section[];
  finalMeeting: Meeting<CourseInstance>;

  optionTypes: string[] = [];

  constructor(course: Course, primarySection: Section, secondarySections: Section[] = []) {
    this.primarySection = primarySection;
    this.secondarySections = secondarySections;
    this.id = this.primarySection.id;
    this.course = course;

    this.sections = [this.primarySection].concat(secondarySections);
    this.sections.forEach((section) => {
      section.courseInstance = this;

      if (this.optionTypes.indexOf(section.type) < 0) {
        this.optionTypes.push(section.type);
      }
    });
  }

  get color(): string {
    return this.course.color;
  }

  getName(): string {
    return this.course.getName();
  }

  setFinalMeeting(finalMeeting: Meeting<CourseInstance>) {
    this.finalMeeting = finalMeeting;
  }

  getOptionsByType(type: string) {
    return this.sections.filter(function(section) {
      return section.type === type;
    });
  }

}
