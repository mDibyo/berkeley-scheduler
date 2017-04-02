import angular = require('angular');

import {DEFAULT_TERM_ABBREV} from '../constants';
import Final = require('../models/final');
import Meeting, {MeetingJson} from '../models/meeting';
import CourseInstance from "../models/courseInstance";
import {BaseService, TermMap} from "../utils";

const foreignLanguageListingUrl = () => 'data/foreignLanguageListing.json';
const finalTimesUrl = (termAbbrev: string) => `data/${termAbbrev}/finals/times.json`;
const finalRulesUrl = (termAbbrev: string) => `data/${termAbbrev}/finals/rules.json`;


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

export default class finals extends BaseService {
  constructor(
      $http: angular.IHttpService,
      private $q: angular.IQService
  ) {
    super($http);

    // Get defaults
    this.finalDatesQByTerm.get(DEFAULT_TERM_ABBREV);
    this.finalRulesAllQByTerm.get(DEFAULT_TERM_ABBREV);
  }

  private finalTimesQByTerm: TermMap<angular.IPromise<FinalTimesJson>> = new TermMap(
      termAbbrev => this.httpGet<FinalTimesJson>('final times', finalTimesUrl(termAbbrev))
  );

  public finalDatesQByTerm: TermMap<angular.IPromise<FinalDates>> = new TermMap(
      termAbbrev => this.finalTimesQByTerm.get(termAbbrev).then(({dates}) => {
        const finalDates: FinalDates = {};
        Object.keys(dates).forEach((day: string) => {
          const date = dates[day];
          finalDates[day] = new Date(date.year, date.month, date.day);
        });
        return finalDates;
      })
  );

  private finalMeetingsQByTerm: TermMap<angular.IPromise<FinalMeetings>> = new TermMap(
      termAbbrev => this.finalTimesQByTerm.get(termAbbrev).then(({meetings}) => {
        const finalMeetings: FinalMeetings = {};
        Object.keys(meetings).forEach((meetingKey) => {
          finalMeetings[meetingKey] = Meeting.parse(meetings[meetingKey], null);
        });
        return finalMeetings;
      })
  );

  private finalRulesAllQByTerm: TermMap<angular.IPromise<FinalRules>> = new TermMap(
      termAbbrev => this.$q.all([
        this.httpGet<FinalRulesJson>('final rules', finalRulesUrl(termAbbrev)),
        this.httpGet<ForeignLanguageListingJson>('foreign language listing', foreignLanguageListingUrl())
      ]).then(([finalRules, foreignLanguageListing]) => {
        (finalRules as FinalRules).foreignLanguageCourses = foreignLanguageListing;
        return finalRules;
      })
  );

  private finalsByCourseInstanceIdByTerm: TermMap<{[id: string]: Final}> = new TermMap(() => ({}));

  private getFinalMeetingQ(termAbbrev: string, meetingKey: string): angular.IPromise<Meeting<null>|null> {
    return this.finalMeetingsQByTerm
        .get(termAbbrev)
        .then(meetings => meetings[meetingKey] || null);
  }

  private getFinalQ(
      termAbbrev: string,
      courseInstance: CourseInstance,
      meetingKey: string
  ): angular.IPromise<Final|null> {
    return this.getFinalMeetingQ(termAbbrev, meetingKey).then(
        finalMeeting => finalMeeting
            ? new Final(courseInstance, Meeting.withOwner(finalMeeting, courseInstance))
            : null
    )
  }

  getFinalMeetingForCourseInstanceQ(
      termAbbrev: string,
      courseInstance: CourseInstance
  ): angular.IPromise<Final> {
    const finalsByCourseInstanceId = this.finalsByCourseInstanceIdByTerm.get(termAbbrev);
    if (finalsByCourseInstanceId.hasOwnProperty(courseInstance.id)) {
      return this.$q.when(finalsByCourseInstanceId[courseInstance.id]);
    }

    return this.finalRulesAllQByTerm
        .get(termAbbrev)
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
        .then(meetingKey => meetingKey ? this.getFinalQ(termAbbrev, courseInstance, meetingKey) : null)
        .then(final => {
          if (final) {
            finalsByCourseInstanceId[courseInstance.id] = final;
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
