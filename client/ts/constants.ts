const termAbbrev: string = 'sp17';

const terms: {[termAbbrev: string]: string} = {
  'fa16': 'Fall 2016',
  'sp17': 'Spring 2017'
};

const termLastDays: {[termAbbrev: string]: Date} = {
  'fa16': new Date(2016, 11, 3),
  'sp17': new Date(2017, 3, 28)
};

export = {
  TERM_ABBREV: termAbbrev,
  TERM: terms[termAbbrev],
  TERM_LAST_DAY: termLastDays[termAbbrev],
  API_URL: 'https://api.berkeleyscheduler.com'
};
