import Course from './courseNew';
import Schedule from './schedule';
import Section from './sectionNew';
import CourseInstance from './courseInstance';

import {Enumerator, OptionsEnumerator, generateId, generateIdFromIds} from '../utils';


type SectionsEnumerator = OptionsEnumerator<Section>;
type CourseInstanceEnumerator = OptionsEnumerator<SectionsEnumerator>;


class ScheduleGroup implements Enumerator<Schedule> {
  id: string;
  userId: string;

  courses: Course[];

  private _courseInstanceEnumerator: CourseInstanceEnumerator;
  private _size: number = 0;
  private _currentSectionsEnumerators: SectionsEnumerator[];

  constructor(userId: string, courses: Course[]) {
    this.id = generateId(userId, courses);
    this.userId = userId;
    this.courses = courses;

    this._courseInstanceEnumerator = new OptionsEnumerator<SectionsEnumerator>(
        this.courses.map((course: Course) => course.instances.map(
            (courseInstance: CourseInstance) => new OptionsEnumerator<Section>(
                courseInstance.optionTypes.map((optionType: string) => courseInstance
                    .getOptionsByType(optionType)
                    .filter(option => option.selected)
                )
            ))
        )
    );
    this.reset();
    this._currentSectionsEnumerators = this._courseInstanceEnumerator.current();

    if (this._courseInstanceEnumerator.size > 0) {
      this._size = this._currentSectionsEnumerators
          .map(e => e.size)
          .reduce((a, b) => a * b, 1);
    }
  }

  get size(): number {
    return this._size;
  }

  get done(): boolean {
    return this._courseInstanceEnumerator.done;
  }

  get expectedOptionsLength(): number {
    return this._currentSectionsEnumerators
        .map(e => e.expectedOptionsLength)
        .reduce((a, b) => a + b, 0);
  }

  reset() {
    this._currentSectionsEnumerators.forEach(e => e.reset());
    this._courseInstanceEnumerator.reset();
  }

  _advance(): boolean {
    do {
      for (
          let incrementPos: number = 0;
          incrementPos < this._currentSectionsEnumerators.length;
          incrementPos++
      ) {
        if (this._currentSectionsEnumerators[incrementPos].next()) {
          return true;
        }
        this._currentSectionsEnumerators[incrementPos].reset();
      }

      this._currentSectionsEnumerators = this._courseInstanceEnumerator.next();
    } while (!this.done);

    return false;
  }

  current(): Schedule|null {
    const sections: Section[]|null =
        this._currentSectionsEnumerators.map(e => e.current()).reduce((a, b) => a.concat(b));
    if (!sections || sections.length != this.expectedOptionsLength) {
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

  static getUserIdFromId(id: string): string {
    return Schedule.getUserIdFromId(id);
  }

  static normalizeId(id: string|null): string|null {
    if (id === null) {
      return null;
    }

    const [userId, ...idComponents] = id.split('.');
    return generateIdFromIds(userId, idComponents);
  }
}
