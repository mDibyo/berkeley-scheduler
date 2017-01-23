import {Option} from './commitment';
import CustomCommitment from './customCommitment';
import Meeting from './meeting';
import {generateRandomAlphaId} from '../utils';


const customCommitmentOptionIdRegex = /^[a-z]{7}$/;

export default class CustomCommitmentOption implements Option {
  id: string;
  type: string = CustomCommitment.customType;
  selected: boolean = true;

  constructor(
      public owner: CustomCommitment,
      public meetings: Meeting<CustomCommitmentOption>[] = []
  ) {
    this.id = generateRandomAlphaId(7);
  }

  static isCustomCommitmentOptionId(id: string) {
    return customCommitmentOptionIdRegex.test(id);
  }
}
