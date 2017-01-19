declare class Time {
  hours: number;
  minutes: number;

  constructor(hours: number, minutes: number);
  static parse(timeJson: {hours: number, minutes: number}|string): Time;

  compareTo(other: Time): number;
  getTotalMinutes(): number;

  static midnight: Time;
  static noon: Time;
  static fivePM: Time;
}

export = Time;
