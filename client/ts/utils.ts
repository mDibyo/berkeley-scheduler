export interface Identifiable {
  id: string;
}

export function generateId(userId: string, items: Identifiable[]): string {
  return generateIdFromIds(userId, items.map((item) => item.id));
}

export function generateIdFromIds(userId: string, ids: string[]): string {
  const idComponents = ids.sort((a, b) => {
    return parseInt(a) - parseInt(b);
  });
  idComponents.unshift(userId);
  return idComponents.join('.');
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
