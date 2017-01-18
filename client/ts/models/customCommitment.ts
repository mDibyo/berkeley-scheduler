import {Option, Commitment} from './commitment';
import {ColorRegisterableIdentifiable} from '../utils';
import Meeting = require('./meeting');
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

    this.option = new CustomCommitmentOption(this, meetings);
  }

  getName(): string {
    return this.name;
  }

  setName(newName: string) {
    this.name = newName;
  }

  getOptionsByType(type: string): Option[] {
    return type === CustomCommitment.customType ? [this.option] : [];
  }
}
