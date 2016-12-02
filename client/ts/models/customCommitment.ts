import {Option, Commitment} from './commitment';
import {ColorRegisterableIdentifiable} from '../utils';


export class CustomCommitment extends ColorRegisterableIdentifiable implements Commitment {
  static customType: string = 'custom';

  name: string;
  optionTypes: string[] = [CustomCommitment.customType];

  private _option: Option;

  getName(): string {
    return this.name;
  }

  setName(newName: string) {
    this.name = newName;
  }

  getOptionsByType(type: string): Option[] {
    if (type !== CustomCommitment.customType) {
      return [];
    }
    return [this._option];
  }
}
