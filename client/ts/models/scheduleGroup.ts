import Course from './course';
import Schedule from './schedule';
import {
  Enumerator,
  OptionsEnumerator as _OptionsEnumerator,
  generateIdFromIdentifiables,
  generateIdFromIds,
  Identifiable
} from '../utils';
import CustomCommitment from './customCommitment';
import {Option, Commitment} from './commitment';


type OptionsEnumerator = _OptionsEnumerator<Option>;
type CommitmentEnumerator = _OptionsEnumerator<OptionsEnumerator>;


export default class ScheduleGroup implements Enumerator<Schedule> {
  id: string;

  private commitmentEnumerator: CommitmentEnumerator;
  private _size: number = 0;
  private _expectedOptionsLength: number;
  private currentOptionsEnumerators: OptionsEnumerator[] = [];
  private options: {[id: string]: Option} = {};

  constructor(
      public userId: string,
      public courses: Course[],
      public customCommitments: CustomCommitment[] = []) {
    this.id = generateIdFromIdentifiables(userId, (<Identifiable[]>courses).concat(customCommitments));

    this._size = 1;
    const commitmentOptionsList: Commitment[][] = this.courses
        .map(course => <Commitment[]>course.instances)
        .concat(this.customCommitments.map(customCommitment => [customCommitment]));
    this.commitmentEnumerator = new _OptionsEnumerator<OptionsEnumerator>(
        commitmentOptionsList.map(commitmentOptions => {
          let courseEnumerationSize = 0;
          const optionsEnumerators = commitmentOptions.map(
              (commitment: Commitment) => {
                console.log(commitment);
                commitment.getOptions().forEach(o => this.options[o.id] = o);
                const optionEnumerator = new _OptionsEnumerator<Option>(
                    commitment.optionTypes.map((optionType: string) => commitment
                        .getOptionsByType(optionType)
                        .filter(option => option.selected)
                    )
                );
                optionEnumerator.next();
                courseEnumerationSize += optionEnumerator.size;
                return optionEnumerator;
              }
          ).filter(e => e.size > 0);
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
    return this.commitmentEnumerator.done;
  }

  get expectedOptionsLength(): number {
    return this._expectedOptionsLength;
  }

  reset(): this {
    this.currentOptionsEnumerators.forEach(e => e && e.reset().next());
    this.commitmentEnumerator.reset();
    this._advanceCommitmentEnumerator();

    return this;
  }

  _advanceCommitmentEnumerator() {
    const optionEnumerators = this.commitmentEnumerator.next();
    if (!this.commitmentEnumerator.done) {
      optionEnumerators[0].reset();
      this.currentOptionsEnumerators = optionEnumerators;
      this._expectedOptionsLength = optionEnumerators
          .map(e => e.expectedOptionsLength)
          .reduce((a, b) => a + b, 0);
    }
  }

  _advance(): boolean {
    while (!this.done) {
      for (
          let incrementPos: number = 0;
          incrementPos < this.currentOptionsEnumerators.length;
          incrementPos++
      ) {
        if (this.currentOptionsEnumerators[incrementPos].next().length) {
          this._expectedOptionsLength = this.currentOptionsEnumerators
              .map(e => e.expectedOptionsLength)
              .reduce((a, b) => a + b, 0);
          return true;
        }
        this.currentOptionsEnumerators[incrementPos].reset().next();
      }

      if (this.done) {
        break;
      }

      this._advanceCommitmentEnumerator();
    }

    return false;
  }

  current(): Schedule|null {
    const options: Option[] = this.currentOptionsEnumerators
        .map(e => e.current())
        .reduce((a, b) => a.concat(b));
    if (options.length != this.expectedOptionsLength) {
      return null;
    }

    return new Schedule(this.userId, options);
  }

  next(): Schedule|null {
    if (!this._advance()) {
      return null;
    }

    return this.current();
  }

  getScheduleById(scheduleId: string): Schedule|null {
    const optionIds: string[] = Schedule.getOptionIdsFromId(scheduleId);
    if (optionIds.length != this.expectedOptionsLength) {
      return null;
    }

    let found = true;
    const options = optionIds.map(optionId => {
      const options = this.options[optionId];
      if (!options) {
        found = false;
      }
      return options;
    }, this);
    if (!found) {
      return null;
    }

    return new Schedule(this.userId, options);
  }

  static getUserIdFromId(id: string): string {
    return Schedule.getUserIdFromId(id);
  }

  static getCommitmentIdsFromId(id: string): string[] {
    return Schedule.getOptionIdsFromId(id);
  }

  static normalizeId(id: string|null): string|null {
    if (id === null) {
      return null;
    }

    const [userId, ...idComponents] = id.split('.');
    return generateIdFromIds(userId, idComponents);
  }
}
