import {Option, Commitment, ColorRegisterableCommitment} from './commitment';


export class CustomCommitment extends ColorRegisterableCommitment implements Commitment {
  static customType: string = 'custom';

  name: string;
  optionTypes: string[] = [CustomCommitment.customType];

  private _option: Option;

  getName(): string {
    return this.name;
  }

  getOptionsByType(type: string): Option[] {
    if (type !== CustomCommitment.customType) {
      return [];
    }
    return [this._option];
  }
}
