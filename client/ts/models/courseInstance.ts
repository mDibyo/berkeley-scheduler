import Section from './section';
import Course from './course';
import {Commitment, Option} from './commitment';
import Final = require("./final");
import {SectionJson, EnrollmentJson} from "./section";


export interface CourseInstanceJson {
  sAC: string;
  cN: string;
  title: string;
  description: string;
  crossListed: string[]|null;

  id: string;
  number: string;
  priComp: string;
  status: string;
  instructionMode: string;
  fExam: boolean;
  units: number;
  grading: string;
  enrollment: EnrollmentJson;
  sections: SectionJson[];
}


export default class CourseInstance implements Commitment {
  id: string;

  secondarySections: Section[];
  sections: Section[];
  finalMeeting: Final;

  optionTypes: string[] = [];

  constructor(
      public course: Course,
      public primarySection: Section,
      secondarySections: Section[] = [],
      public hasFinalExam: boolean
  ) {
    this.secondarySections = secondarySections;
    this.id = this.primarySection.id;


    this.sections = [this.primarySection].concat(secondarySections);
    this.sections.forEach((section) => {
      section.owner = this;

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

  getOptions(): Option[] {
    return this.sections;
  }

  setFinalMeeting(finalMeeting: Final) {
    this.finalMeeting = finalMeeting;
  }

  getOptionsByType(type: string) {
    return this.sections.filter(function(section) {
      return section.type === type;
    });
  }

}
