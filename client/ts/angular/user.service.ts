import angular = require('angular');

import IReverseLookupService = require('./reverseLookup.service');
import IScheduleService = require('./schedule.service');

import constants = require('../constants');

import Course = require('../models/course');
import Time = require('../models/time');
import Section = require('../models/section');
import Schedule = require('../models/schedule');

const userIdCharSet = 'abcdefghijklmnopqrstuvwxyz0123456789';


export interface Preferences {
  showMobUnoptDialog: boolean;
}

export interface SchedulingOptions {
  showSavedSchedules: boolean;
  showOptions: boolean;
  minimizeGaps: boolean;
  maximizeGaps: boolean;
  minimizeNumberOfDays: boolean;
  maximizeNumberOfDays: boolean;
  preferMornings: boolean;
  preferAfternoons: boolean;
  preferEvenings: boolean;
  preferNoTimeConflicts: boolean;
  dayStartTime: Time;
  dayEndTime: Time;
  noTimeConflicts: boolean;
  showFinalsSchedule: boolean;
}

// export interface CourseMap {[courseId: string]: Course}

export interface CourseInfo {
  id: string;
  selected: boolean;
  selectedSections: string[];
  unselectedSections: string[];
}


function _generateId(charSet: string, numChars: number) {
  var id = '';
  for (var i = 0; i < numChars; i++) {
    id += charSet[Math.floor(Math.random() * charSet.length)]
  }
  return id;
}


class UserService {
  private _$cookies: angular.cookies.ICookiesService;
  private _$q: angular.IQService;
  private _reverseLookupService: IReverseLookupService;
  private _scheduleService: IScheduleService;

  private _cookieExpiryDate = (() => {
    var date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date;
  })();
  private static _primaryUserIdCookieKey = 'primaryUserId';
  private static _preferencesCookieKeySuffix = 'preferences';
  private static _schedulingOptionsCookieKeySuffix = 'schedulingOptions';
  private static _courseInfosCookieKeySuffix = 'addedCourses';
  private static _savedScheduleIdsCookieKeySuffix = 'savedScheduleIds';

  private _primaryUserId: string;
  private _preferences: Preferences;
  private _schedulingOptions: SchedulingOptions;
  private _courses: Course[] = [];
  private _coursesQ: angular.IPromise<Course[]>;
  private _savedSchedules: Schedule[] = [];
  private _savedSchedulesQ: angular.IPromise<Schedule[]>;

  constructor(
      $cookies: angular.cookies.ICookiesService,
      $q: angular.IQService,
      reverseLookupService: IReverseLookupService,
      scheduleService: IScheduleService
  ) {
    this._$cookies = $cookies;
    this._$q = $q;
    this._reverseLookupService = reverseLookupService;
    this._scheduleService = scheduleService;
  }

  private get primaryUserId(): string {
    if (!this._primaryUserId) {
      let primaryUserId = this._$cookies.get(UserService._primaryUserIdCookieKey);
      if (primaryUserId === undefined) {
        primaryUserId = _generateId(userIdCharSet, 10);
        this._$cookies.put(UserService._primaryUserIdCookieKey, primaryUserId, {
          expires: this._cookieExpiryDate
        });
      }
      this._primaryUserId = primaryUserId;
    }

    return this._primaryUserId;
  }

  get primaryUserIdTermIdentifier(): string {
    return `${this.primaryUserId}.${constants.TERM_ABBREV}`;
  }

  get preferences(): Preferences {
    if (!this._preferences) {
      const preferencesCookieKey: string =
          `${this.primaryUserId}.${UserService._preferencesCookieKeySuffix}`;
      let preferences: Preferences = this._$cookies.getObject(preferencesCookieKey);
      preferences = angular.extend({
        showMobUnoptDialog: true
      }, preferences);
      this._preferences = preferences;
    }

    return angular.copy(this._preferences);
  }
  set preferences(newPreferences: Preferences) {
    this._preferences = newPreferences;
    const preferencesCookieKey: string =
      `${this.primaryUserId}.${UserService._preferencesCookieKeySuffix}`;
    this._$cookies.putObject(preferencesCookieKey, newPreferences, {
      expires: this._cookieExpiryDate
    });
  }
  setPreference(preference: string, choice: any) {
    this.preferences = angular.extend(this._preferences, {
      [preference]: choice
    });
  }

  get schedulingOptions(): SchedulingOptions {
    if (!this._schedulingOptions) {
      const schedulingOptionsCookieKey: string =
        `${this.primaryUserId}.${UserService._schedulingOptionsCookieKeySuffix}`;
      let schedulingOptions: SchedulingOptions =
        this._$cookies.getObject(schedulingOptionsCookieKey) || {};

      schedulingOptions = angular.extend({
        showSavedSchedules: false,
        showOptions: false,
        minimizeGaps: false,
        maximizeGaps: false,
        minimizeNumberOfDays: false,
        maximizeNumberOfDays: false,
        preferMornings: false,
        preferAfternoons: false,
        preferEvenings: false,
        preferNoTimeConflicts: false,
        dayStartTime: null,
        dayEndTime: null,
        noTimeConflicts: true,
        showFinalsSchedule: false,
      }, schedulingOptions);
      const startTime: Time = schedulingOptions.dayStartTime;
      schedulingOptions.dayStartTime = new Time(startTime.hours, startTime.minutes);
      const endTime: Time = schedulingOptions.dayEndTime;
      schedulingOptions.dayEndTime = new Time(endTime.hours, endTime.minutes);

      this._schedulingOptions = schedulingOptions;
    }

    return angular.copy(this._schedulingOptions);
  }
  set schedulingOptions(newSchedulingOptions: SchedulingOptions) {
    this._schedulingOptions = newSchedulingOptions;
    const schedulingOptionsCookieKey: string =
      `${this.primaryUserId}.${UserService._schedulingOptionsCookieKeySuffix}`;
    this._$cookies.putObject(schedulingOptionsCookieKey, newSchedulingOptions, {
      expires: this._cookieExpiryDate
    });
  }

  get coursesQ(): angular.IPromise<Course[]> {
    if (!this._coursesQ) {
      let courseInfosCookieKey: string =
        `${this.primaryUserIdTermIdentifier}.${UserService._courseInfosCookieKeySuffix}`;
      let courseInfos: CourseInfo[] = this._$cookies.getObject(courseInfosCookieKey);
      if (!courseInfos) {
        courseInfosCookieKey =
          `${this.primaryUserId}.${UserService._courseInfosCookieKeySuffix}`;
        courseInfos = this._$cookies.getObject(courseInfosCookieKey);
      }

      if (courseInfos) {
        this._coursesQ = this._$q.all(courseInfos.map((courseInfo: CourseInfo) => {
          return this._reverseLookupService.getCourseQBy1arySectionId(courseInfo.id).then(
            (course: Course) => {
              course.selected = courseInfo.selected === undefined || courseInfo.selected;
              course.sections.forEach((section: Section) => {
                if (courseInfo.unselectedSections.indexOf(section.id) >= 0) {
                  section.selected = false;
                }
              });
              this._courses.push(course);
            });
        })).then(() => angular.copy(this._courses));
      } else {
        this._coursesQ = this._$q.resolve(angular.copy(this._courses));
      }
    }

    return this._coursesQ;
  }
  set courses(newCourses: Course[]) {
    this._coursesQ.then(() => this._courses = newCourses);

    const courseInfos: CourseInfo[] = [];
    for (const id in newCourses) {
      const selectedSections: string[] = [];
      const unselectedSections: string[] = [];
      newCourses[id].sections.forEach((section: Section) => {
        if (section.selected) {
          selectedSections.push(section.id);
        } else {
          unselectedSections.push(section.id);
        }
      });
      courseInfos.push({
        id: id,
        selected: newCourses[id].selected,
        selectedSections: selectedSections,
        unselectedSections: unselectedSections
      });
    }
    const courseInfosCookieKey: string =
      `${this.primaryUserIdTermIdentifier}.${UserService._courseInfosCookieKeySuffix}`;
    this._$cookies.putObject(courseInfosCookieKey, courseInfos, {
      expires: this._cookieExpiryDate
    });
  }

  get savedSchedulesQ(): angular.IPromise<Schedule[]> {
    if (!this._savedSchedulesQ) {
      let savedScheduleIdsCookieKey: string =
        `${this.primaryUserIdTermIdentifier}.${UserService._savedScheduleIdsCookieKeySuffix}`;
      let savedScheduleIds: string[] = this._$cookies.getObject(savedScheduleIdsCookieKey);
      if (!savedScheduleIds) {
        savedScheduleIdsCookieKey =
          `${this.primaryUserId}.${UserService._savedScheduleIdsCookieKeySuffix}`;
        savedScheduleIds = this._$cookies.getObject(savedScheduleIdsCookieKey);
      }

      if (savedScheduleIds) {
        this._savedSchedulesQ = this._$q.all(savedScheduleIds.map((scheduleId: string) => {
          return this._scheduleService.getScheduleQById(scheduleId).then(
            (schedule: Schedule) =>  this._savedSchedules.push(schedule)
          );
        })).then(() => angular.copy(this._savedSchedules));
      } else {
        this._savedSchedulesQ = this._$q.resolve(angular.copy(this._savedSchedules));
      }
    }

    return this._savedSchedulesQ;
  }
  set savedSchedules(newSavedSchedules: Schedule[]) {
    this._savedSchedulesQ.then(() => this._savedSchedules = newSavedSchedules);
    const scheduleIds: string[] = newSavedSchedules.map((s) => s.id);
    const savedScheduleIdsCookieKey: string =
      `${this.primaryUserIdTermIdentifier}.${UserService._savedScheduleIdsCookieKeySuffix}`;
    this._$cookies.putObject(savedScheduleIdsCookieKey, scheduleIds, {
      expires: this._cookieExpiryDate
    });
  }
}

angular.module('berkeleyScheduler').service('userService', [
  '$cookies',
  '$q',
  'reverseLookup',
  'scheduleFactory',
  UserService
]);
