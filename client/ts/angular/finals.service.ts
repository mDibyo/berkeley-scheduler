import angular = require('angular');

import * as constants from '../constants';

import Final = require('../models/final');
import Meeting, {MeetingJson} from '../models/meeting';
import CourseInstance from "../models/courseInstance";

const foreignLanguageListingUrl = 'data/foreignLanguageListing.json';
const finalTimesUrl = 'data/' + constants.TERM_ABBREV + '/finals/times.json';
const finalRulesUrl = 'data/' + constants.TERM_ABBREV + '/finals/rules.json';


interface DateJson {
  year: number;
  month: number;
  day: number;
}

interface FinalTimesJson {
  dates: {[day: string]: DateJson},
  meetings: {[meetingKey: string]: MeetingJson}
}

interface ForeignLanguageListingJson {[subjectAreaCode: string]: string[]}
interface MeetingKeys {[for_: string]: string}
interface FinalRulesJson {
  MTWRFCourses: MeetingKeys;
  TRCourses: MeetingKeys;
  SatSunCourses: string;
  exceptions: {[subjectAres: string]: MeetingKeys};
  foreignLanguageListing: string;
}

interface FinalDates {[day: string]: Date}
interface FinalMeetings {[meetingKey: string]: Meeting<null>}

interface FinalRules extends FinalRulesJson {
  foreignLanguageCourses: ForeignLanguageListingJson;
}

export default class finals {
  public finalDatesQ: angular.IPromise<FinalDates>;
  private finalMeetingsQ: angular.IPromise<FinalMeetings>;

  private finalsByCourseInstanceId: {[id: string]: Final} = {};
  private finalRulesAllQ: angular.IPromise<FinalRules>;

  constructor(
      private $http: angular.IHttpService,
      private $q: angular.IQService
  ) {
    const finalTimesQ: angular.IPromise<FinalTimesJson> = this.$http
        .get(finalTimesUrl)
        .then(response => response.data, err => {
          console.error(`could not retrieve foreign language listing: ${err}`);
          return {dates: {}, meetings: {}};
        });
    this.finalDatesQ = finalTimesQ.then(({dates}) => {
      const finalDates: FinalDates = {};
      Object.keys(dates).forEach((day: string) => {
        const date = dates[day];
        finalDates[day] = new Date(date.year, date.month, date.day);
      });
      return finalDates;
    });
    this.finalMeetingsQ = finalTimesQ.then(({meetings}) => {
      const finalMeetings: FinalMeetings = {};
      Object.keys(meetings).forEach((meetingKey) => {
        finalMeetings[meetingKey] = Meeting.parse(meetings[meetingKey], null);
      });
      return finalMeetings;
    });

    const finalRulesQ: angular.IPromise<FinalRulesJson> = this.$http
        .get(finalRulesUrl)
        .then(response => response.data, err => {
          console.error(`could not retrieve final rules: ${err}`);
          return {};
        });
    const foreignLanguagesListingQ: angular.IPromise<ForeignLanguageListingJson> = this.$http
        .get(foreignLanguageListingUrl)
        .then(response => response.data, (err) => {
          console.error(`could not retrieve foreign language listing: ${err}`);
          return {};
        });
    this.finalRulesAllQ = this.$q.all([
      finalRulesQ,
      foreignLanguagesListingQ
    ]).then(([finalRules, foreignLanguageListing]) => {
      (finalRules as FinalRules).foreignLanguageCourses = foreignLanguageListing;
      return finalRules;
    });
  }

  private getFinalMeetingQ(meetingKey: string): angular.IPromise<Meeting<null>|null> {
    return this.finalMeetingsQ.then(meetings => meetings[meetingKey] || null);
  }

  private getFinalQ(courseInstance: CourseInstance, meetingKey: string): angular.IPromise<Final|null> {
    return this.getFinalMeetingQ(meetingKey).then(
        finalMeeting => finalMeeting
            ? new Final(courseInstance, Meeting.withOwner(finalMeeting, courseInstance))
            : null
    )
  }

  getFinalMeetingForCourseInstanceQ(courseInstance: CourseInstance): angular.IPromise<Final> {
    if (this.finalsByCourseInstanceId.hasOwnProperty(courseInstance.id)) {
      return this.$q.when(this.finalsByCourseInstanceId[courseInstance.id]);
    }

    return this.finalRulesAllQ
        .then((finalRulesAll) => {
          const {department, courseNumber} = courseInstance.course;

          // exceptions.
          const exceptions = finalRulesAll.exceptions;
          if (exceptions.hasOwnProperty(department)) {
            if (exceptions[department].hasOwnProperty(courseNumber)) {
              return exceptions[department][courseNumber];
            }
          }

          // foreign language.
          const flCourses = finalRulesAll.foreignLanguageCourses;
          if (flCourses.hasOwnProperty(department)) {
            if (flCourses[department].hasOwnProperty(courseNumber)) {
              return finalRulesAll.foreignLanguageListing;
            }
          }

          if (!courseInstance.primarySection.meetings.length) {
            return null;
          }

          // TODO(dibyo): Handle multiple primary sections for courses
          const courseMeeting = courseInstance.primarySection.meetings[0];
          const courseDays = courseMeeting.days;
          if (courseDays.Saturday || courseDays.Sunday) {
            return finalRulesAll.SatSunCourses;
          } else if (courseDays.Monday ||
              courseDays.Wednesday ||
              courseDays.Friday) {
            return finalRulesAll.MTWRFCourses[courseMeeting.startTime.hours];
          } else if (courseDays.Tuesday || courseDays.Thursday) {
            return finalRulesAll.TRCourses[courseMeeting.startTime.hours];
          }
        })
        .then(meetingKey => meetingKey ? this.getFinalQ(courseInstance, meetingKey) : null)
        .then(final => {
          if (final) {
            this.finalsByCourseInstanceId[courseInstance.id] = final;
          }
          return final;
        })
  }
}

angular.module('berkeleyScheduler').service('finals', [
  '$http',
  '$q',
  finals
]);
