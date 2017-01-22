import {Option, Commitment} from './commitment';
import {ColorRegisterableIdentifiable, generateRandomAlphaNumericId} from '../utils';
import Meeting from './meeting';
import {CustomCommitmentOption} from './customCommitmentOption';


export class CustomCommitment extends ColorRegisterableIdentifiable implements Commitment {
  static customType: string = 'custom';

  optionTypes: string[] = [CustomCommitment.customType];
  option: CustomCommitmentOption;
  selected: boolean = false;

  constructor(
      private name: string,
      meetings?: Meeting<CustomCommitmentOption>[]
  ) {
    super();

    this.id = generateRandomAlphaNumericId(7);
    this.option = new CustomCommitmentOption(this, meetings);
  }

  getName(): string {
    return this.name;
  }

  setName(newName: string) {
    this.name = newName;
  }

  getOptions(): Option[] {
    return [this.option]
  }

  getOptionsByType(type: string): Option[] {
    return type === CustomCommitment.customType ? [this.option] : [];
  }

  addMeeting(): Meeting<CustomCommitmentOption> {
    const meeting = new Meeting(undefined, undefined, undefined, undefined, undefined, this.option);
    this.option.meetings.push(meeting);
    return meeting;
  }
}
