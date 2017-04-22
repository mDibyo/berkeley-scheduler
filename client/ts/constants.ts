export const DEFAULT_TERM_ABBREV = 'fa17';
export const API_URL = "https://api.berkeleyscheduler.com";

export interface Term {
  abbrev: string;
  name: string;
  lastDay: Date;
}

export const terms: {[termAbbrev: string]: Term} = {
  'fa16': {
    abbrev: 'fa16',
    name: 'Fall 2016',
    lastDay: new Date(2016, 11, 3)
  },
  'sp17': {
    abbrev: 'sp17',
    name: 'Spring 2017',
    lastDay: new Date(2017, 3, 28)
  },
  'fa17': {
    abbrev: 'fa17',
    name: 'Fall 2017',
    lastDay: new Date(2017, 11, 8)
  }
};

export function termName(termAbbrev: string): string {
  return terms[termAbbrev].name;
}

export function termLastDay(termAbbrev: string): Date {
  return terms[termAbbrev].lastDay;
}

export const shareThresholds: number[] = [
    5 * 60 + 30,
    20 * 60,
    2 * 60 * 60,
    Infinity
];
