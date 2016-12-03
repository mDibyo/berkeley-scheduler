///<reference path="../lib/polyfills.ts" />
import {Identifiable} from '../utils';
import Meeting = require('./meeting');
export interface Option {}


export interface Commitment extends Identifiable {
  id: string;
  color: string;

  // add(): void;
  // drop(): void;

  getName(): string;

  optionTypes: string[];
  getOptionsByType(type: string): Option[];
}

export interface Option extends Identifiable {
  type: string;
  selected: boolean;
  owner: Commitment;

  meetings: Meeting<Option>[];
}
