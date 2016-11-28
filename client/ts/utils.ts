export interface Identifiable {
  id: string;
}

export function generateId(userId: string, items: Identifiable[]): string {
  const idComponents = items.map((item) => item.id).sort((a, b) => a - b);
  idComponents.unshift(userId);
  return idComponents.join('.');
}


export class OptionEnumerator<Option> {
  private _optionChoicesMatrix: Option[][] = [];
  private _optionChoicesIndices: number[] = [];
  private _optionChoicesLengths: number[] = [];
  private _length: number = 0;

  constructor(optionChoicesMatrix: Option[][]) {
    optionChoicesMatrix.forEach((optionChoices) => {
      this._optionChoicesMatrix.push(optionChoices);
      this._optionChoicesIndices.push(0);
      this._optionChoicesLengths.push(optionChoices.length);
    });
    this.reset();

    if (this._optionChoicesLengths.length > 0) {
      this._length = this._optionChoicesLengths.reduce(function (a, b) {
        return a * b;
      }, 1);
    }
  }

  get length(): number {
    return this._length;
  }

  reset() {
    for (var i = 0; i < this._optionChoicesLengths.length; i++) {
      this._optionChoicesIndices[i] = 0;
    }
    this._optionChoicesIndices[0] = -1;
  }

  _advance() {
    if (!this.length) {
      return false;
    }

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
    return false;
  }

  next(): Option[]|null {
    if (!this._advance()) {
      return null;
    }

    return this._optionChoicesMatrix.map(
        (options: Option[], pos: number) => options[this._optionChoicesIndices[pos]]
    );
  }
}
