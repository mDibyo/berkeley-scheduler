import Course from './course';
import Schedule = require('./schedule');
import Section from './section';
import CourseInstance from './courseInstance';

import {Enumerator, OptionsEnumerator, generateId, generateIdFromIds} from '../utils';


type SectionsEnumerator = OptionsEnumerator<Section>;
type CourseInstanceEnumerator = OptionsEnumerator<SectionsEnumerator>;


export default class ScheduleGroup implements Enumerator<Schedule> {
  id: string;
  userId: string;

  courses: Course[];

  private _courseInstanceEnumerator: CourseInstanceEnumerator;
  private _size: number = 0;
  private _expectedOptionsLength: number;
  private _currentSectionsEnumerators: SectionsEnumerator[] = [];
  private _sections: {[id: string]: Section} = {};

  constructor(userId: string, courses: Course[]) {
    this.id = generateId(userId, courses);
    this.userId = userId;
    this.courses = courses;

    this._size = 1;
    this._courseInstanceEnumerator = new OptionsEnumerator<SectionsEnumerator>(
        this.courses.map((course: Course) => {
          let courseEnumerationSize = 0;
          const optionsEnumerators = course.instances.map(
              (courseInstance: CourseInstance) => {
                courseInstance.sections.forEach(s => this._sections[s.id] = s);
                const optionEnumerator = new OptionsEnumerator<Section>(
                    courseInstance.optionTypes.map((optionType: string) => courseInstance
                        .getOptionsByType(optionType)
                        .filter(option => option.selected)
                    )
                );
                optionEnumerator.next();
                courseEnumerationSize += optionEnumerator.size;
                return optionEnumerator;
              }
          );
          this._size *= courseEnumerationSize;
          return optionsEnumerators;
        })
    );
    this.reset();
  }

  get size(): number {
    return this._size;
  }

  get done(): boolean {
    return this._courseInstanceEnumerator.done;
  }

  get expectedOptionsLength(): number {
    return this._expectedOptionsLength;
  }

  reset(): this {
    this._currentSectionsEnumerators.forEach(e => e && e.reset().next());
    this._courseInstanceEnumerator.reset();
    this._advanceCourseInstanceEnumerator();

    return this;
  }

  _advanceCourseInstanceEnumerator() {
    const sectionEnumerators = this._courseInstanceEnumerator.next();
    if (!this._courseInstanceEnumerator.done) {
      sectionEnumerators[0].reset();
      this._currentSectionsEnumerators = sectionEnumerators;
      this._expectedOptionsLength = sectionEnumerators
          .map(e => e.expectedOptionsLength)
          .reduce((a, b) => a + b, 0);
    }
  }

  _advance(): boolean {
    while (!this.done) {
      for (
          let incrementPos: number = 0;
          incrementPos < this._currentSectionsEnumerators.length;
          incrementPos++
      ) {
        if (this._currentSectionsEnumerators[incrementPos].next().length) {
          this._expectedOptionsLength = this._currentSectionsEnumerators
              .map(e => e.expectedOptionsLength)
              .reduce((a, b) => a + b, 0);
          return true;
        }
        this._currentSectionsEnumerators[incrementPos].reset().next();
      }

      if (this.done) {
        break;
      }

      this._advanceCourseInstanceEnumerator();
    }

    return false;
  }

  current(): Schedule|null {
    const sections: Section[] = this._currentSectionsEnumerators
        .map(e => e.current())
        .reduce((a, b) => a.concat(b));
    if (sections.length != this.expectedOptionsLength) {
      return null;
    }

    return new Schedule(this.userId, sections);
  }

  next(): Schedule|null {
    if (!this._advance()) {
      return null;
    }

    return this.current();
  }

  getScheduleById(scheduleId: string): Schedule|null {
    const sectionIds: string[] = Schedule.getSectionIdsFromId(scheduleId);
    if (sectionIds.length != this.expectedOptionsLength) {
      return null;
    }

    let found = true;
    const sections = sectionIds.map(sectionId => {
      const section = this._sections[sectionId];
      if (!section) {
        found = false;
      }
      return section;
    }, this);
    if (!found) {
      return null;
    }

    return new Schedule(this.userId, sections);
  }

  static getUserIdFromId(id: string): string {
    return Schedule.getUserIdFromId(id);
  }

  static getCourseInstanceIdsFromId(id: string): string[] {
    return Schedule.getSectionIdsFromId(id).map(id => id.toString());
  }

  static normalizeId(id: string|null): string|null {
    if (id === null) {
      return null;
    }

    const [userId, ...idComponents] = id.split('.');
    return generateIdFromIds(userId, idComponents);
  }
}
