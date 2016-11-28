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

export interface CommitmentColorMap {
  [id: string]: string
}

export abstract class ColorRegisterableCommitment {
  id: string;
  color: string;

  private static colorCodes = {
    'red': '#f44336',
    'pink': '#e91e63',
    'purple': '#9c27b0',
    'deep-purple': '#673ab7',
    'indigo': '#3f51b5',
    'blue': '#2196f3',
    'light-blue': '#03a9f4', //
    'cyan': '#00bcd4',
    'teal': '#009688',
    'green': '#4caf50',
    'light-green': '#8bc34a',
    // 'lime': '#cddc39',
    // 'yellow': '#ffeb3b',
    'amber': '#ffc107',
    'orange': '#ff9800',
    'deep-orange': '#ff5722',
    'brown': '#795548',
    'blue-grey': '#607d8b'
  };

  private static unregisteredColors: string[] = Object.keys(ColorRegisterableCommitment.colorCodes);

  private static registeredColors: string[] = [];

  private static commitmentColors: CommitmentColorMap = {};

  private static getRegisteredColor() {
    var l = ColorRegisterableCommitment.unregisteredColors.length;
    if (l == 0) {
      return ColorRegisterableCommitment.registeredColors[
          Math.floor(Math.random() * ColorRegisterableCommitment.registeredColors.length)]
    }
    var idx = Math.floor(Math.random() * l);
    var color = ColorRegisterableCommitment.unregisteredColors.splice(idx, 1)[0];
    ColorRegisterableCommitment.registeredColors.push(color);
    return color;
  }

  private static unregisterColor(color: string) {
    ColorRegisterableCommitment.registeredColors.remove(color);
    ColorRegisterableCommitment.unregisteredColors.push(color);
  }

  add() {
    if (!ColorRegisterableCommitment.commitmentColors.hasOwnProperty(String(this.id))) {
      ColorRegisterableCommitment.commitmentColors[this.id] = ColorRegisterableCommitment.getRegisteredColor();
    }
    this.color = ColorRegisterableCommitment.commitmentColors[this.id];
  }

  drop() {
    delete ColorRegisterableCommitment.commitmentColors[this.id];
    ColorRegisterableCommitment.unregisterColor(this.color);
  }

  abstract getName(): string;

  abstract getOptionsByType(type: string): Option[];
}
