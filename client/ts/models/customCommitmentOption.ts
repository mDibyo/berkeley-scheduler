import {Option} from './commitment';
import {CustomCommitment} from './customCommitment';
import Meeting = require('./meeting');
import {generateRandomAlphaNumericId} from '../utils';


export class CustomCommitmentOption implements Option {
  id: string;
  type: string = CustomCommitment.customType;
  selected: boolean = true;

  constructor(
      public owner: CustomCommitment,
      public meetings: Meeting<CustomCommitmentOption>[] = []
  ) {
    this.id = generateRandomAlphaNumericId(7);
  }
}
