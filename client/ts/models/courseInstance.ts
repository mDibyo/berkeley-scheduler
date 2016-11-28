import Section from './section';
import Course from './courseNew';
import {Commitment, ColorRegisterableCommitment} from './commitment';
import Meeting from './meeting';


export default class CourseInstance extends ColorRegisterableCommitment {
  id: string;
  color: string;
  course: Course;

  primarySection: Section;
  sections: Section[];
  finalMeeting: Meeting;

  optionTypes: string[] = [];

  constructor(course: Course, primarySection: Section, otherSections: Section[]) {
    super();

    this.primarySection = primarySection;
    this.id = this.primarySection.id;
    this.course = course;

    this.sections = [this.primarySection].concat(otherSections);
    this.sections.forEach((section) => {
      section.course = this;

      if (this.optionTypes.indexOf(section.type) < 0) {
        this.optionTypes.push(section.type);
      }
    });
  }

  getName(): string {
    return this.course.getName();
  }

  setFinalMeeting(finalMeeting: Meeting) {
    this.finalMeeting = finalMeeting;
  }

  getOptionsByType(type: string) {
    return this.sections.filter(function(section) {
      return section.type === type;
    });
  }

}
