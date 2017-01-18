declare class Time {
  hours: number;
  minutes: number;

  constructor(hours: number, minutes: number);
  compareTo(other: Time): number;
  getTotalMinutes(): number;

  static midnight: Time;
  static noon: Time;
  static fivePM: Time;
}

export = Time;
