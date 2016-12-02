///<reference path="../lib/polyfills.ts" />
import {Identifiable} from '../utils';
export interface Option {}


export interface Commitment extends Identifiable {
  id: string;
  color: string;

  add(): void;
  drop(): void;

  getName(): string;

  optionTypes: string[];
  getOptionsByType(type: string): Option[];
}
