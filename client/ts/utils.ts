const alphaCharSet: string[] = 'abcdefghijklmnopqrstuvwxyz'.split('');
const numericCharSet: string[] = '0123456789'.split('');
const alphaNumericCharSet: string[] = alphaCharSet.concat(numericCharSet);

export interface StringMap<V> {[day: string]: V}

export interface Days<V> extends StringMap<V> {
  'Monday': V;
  'Tuesday': V;
  'Wednesday': V;
  'Thursday': V;
  'Friday': V;
  'Saturday': V;
  'Sunday': V;
}
export function getDefaultDays<V>(defaultValueFunc: () => V): Days<V> {
  return {
    'Monday': defaultValueFunc(),
    'Tuesday': defaultValueFunc(),
    'Wednesday': defaultValueFunc(),
    'Thursday': defaultValueFunc(),
    'Friday': defaultValueFunc(),
    'Saturday': defaultValueFunc(),
    'Sunday': defaultValueFunc()
  };
}

export type Listener<T> = (item: T) => void;
export interface ListenerMap<T> {[tag: string]: Listener<T>}
export function addListener<T>(listenerMap: ListenerMap<T>, tag: string, listener: Listener<T>) {
  listenerMap[tag] = listener;
}

export function sample(set: string[]): string {
  return set[Math.floor(Math.random() * set.length)]
}

export function generateRandomId(elementSet: string[], numChars: number): string {
  let id: string = '';
  for (let i = 0; i < numChars; i++) {
    id += sample(elementSet);
  }
  return id;
}
export function generateRandomAlphaNumericId(numChars: number): string {
  return generateRandomId(alphaNumericCharSet, numChars);
}
export function generateRandomAlphaId(numChars: number): string {
  return generateRandomId(alphaCharSet, numChars);
}

export interface Identifiable {
  id: string;
}
export function generateIdFromIdentifiables(userId: string, items: Identifiable[]): string {
  return generateIdFromIds(userId, items.map((item) => item.id));
}
export function generateIdFromIds(userId: string, ids: string[]): string {
  const idComponents = ids.sort();
  idComponents.unshift(userId);
  return idComponents.join('.');
}


export interface ColorMap extends StringMap<string> {}

export abstract class ColorRegisterableIdentifiable implements Identifiable {
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

  private static unregisteredColors: string[] = Object.keys(ColorRegisterableIdentifiable.colorCodes);

  private static registeredColors: string[] = [];

  private static commitmentColors: ColorMap = {};

  private static getRegisteredColor() {
    const l = ColorRegisterableIdentifiable.unregisteredColors.length;
    if (l == 0) {
      return ColorRegisterableIdentifiable.registeredColors[
          Math.floor(Math.random() * ColorRegisterableIdentifiable.registeredColors.length)]
    }
    const idx = Math.floor(Math.random() * l);
    const color = ColorRegisterableIdentifiable.unregisteredColors.splice(idx, 1)[0];
    ColorRegisterableIdentifiable.registeredColors.push(color);
    return color;
  }

  private static unregisterColor(color: string) {
    ColorRegisterableIdentifiable.registeredColors.remove(color);
    ColorRegisterableIdentifiable.unregisteredColors.push(color);
  }

  add() {
    if (!ColorRegisterableIdentifiable.commitmentColors.hasOwnProperty(String(this.id))) {
      ColorRegisterableIdentifiable.commitmentColors[this.id] = ColorRegisterableIdentifiable.getRegisteredColor();
    }
    this.color = ColorRegisterableIdentifiable.commitmentColors[this.id];
  }

  drop() {
    delete ColorRegisterableIdentifiable.commitmentColors[this.id];
    ColorRegisterableIdentifiable.unregisterColor(this.color);
  }
}


export interface Enumerator<Enumeration> {
  reset(): this;
  current(): Enumeration|null;
  next(): Enumeration|null;
  size: number;
  done: boolean;
}

export class OptionsEnumerator<Option> implements Enumerator<Option[]> {
  private _optionChoicesMatrix: Option[][] = [];
  private _optionChoicesIndices: number[] = [];
  private _optionChoicesLengths: number[] = [];
  private _size: number = 0;
  private _done: boolean = true;

  constructor(optionChoicesMatrix: Option[][]) {
    optionChoicesMatrix.forEach((optionChoices) => {
      this._optionChoicesMatrix.push(optionChoices);
      this._optionChoicesIndices.push(0);
      this._optionChoicesLengths.push(optionChoices.length);
    });
    this.reset();

    if (this._optionChoicesLengths.length > 0) {
      this._size = this._optionChoicesLengths.reduce((a, b) => a * b, 1);
      this._done = false;
    }
  }

  get size(): number {
    return this._size;
  }

  get done(): boolean {
    return this._done;
  }

  get expectedOptionsLength(): number {
    return this._optionChoicesLengths.length;
  }

  reset(): this {
    for (let i = 0; i < this._optionChoicesLengths.length; i++) {
      this._optionChoicesIndices[i] = 0;
    }
    this._optionChoicesIndices[0] = -1;
    this._done = false;

    return this;
  }

  _advance(): boolean {
    for (
        let incrementPos: number = 0;
        incrementPos < this._optionChoicesLengths.length;
        incrementPos++
    ) {
      this._optionChoicesIndices[incrementPos]++;
      if (this._optionChoicesIndices[incrementPos] < this._optionChoicesLengths[incrementPos]) {
        return true;
      }
      this._optionChoicesIndices[incrementPos] = 0;
    }
    this._done = true;
    return false;
  }

  current(): Option[] {
    if (this.done) {
      return [];
    }

    return this._optionChoicesMatrix.map(
        (options: Option[], pos: number) => options[this._optionChoicesIndices[pos]]
    );
  }

  next(): Option[] {
    if (!this._advance()) {
      return [];
    }

    return this.current();
  }
}
