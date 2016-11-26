declare class Time {
  hours: number;
  minutes: number;

  constructor(hours: number, minutes: number);
  compareTo(other: Time): number;
}

export = Time;
