import angular = require('angular');

import constants = require('../constants');

import Time = require('../models/time');
import Schedule = require('../models/schedule');
import {generateRandomAlphaNumericId} from '../utils';


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

export interface CourseInfo {
  id: string;
  selected: boolean;
  selectedSections: string[];
  unselectedSections: string[];
}


export default class UserService {
  private _$cookies: angular.cookies.ICookiesService;
  private _$q: angular.IQService;

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

  constructor(
      $cookies: angular.cookies.ICookiesService,
      $q: angular.IQService,
  ) {
    this._$cookies = $cookies;
    this._$q = $q;
  }

  private get primaryUserId(): string {
    if (!this._primaryUserId) {
      let primaryUserId = this._$cookies.get(UserService._primaryUserIdCookieKey);
      if (primaryUserId === undefined) {
        primaryUserId = generateRandomAlphaNumericId(10);
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
      if (schedulingOptions.dayStartTime) {
        const startTime: Time = schedulingOptions.dayStartTime;
        schedulingOptions.dayStartTime = new Time(startTime.hours, startTime.minutes);
      }
      if (schedulingOptions.dayEndTime) {
        const endTime: Time = schedulingOptions.dayEndTime;
        schedulingOptions.dayEndTime = new Time(endTime.hours, endTime.minutes);
      }

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
  setSchedulingOption(option: string, choice: any) {
    this.schedulingOptions = angular.extend(this._schedulingOptions, {
      [option]: choice
    });
  }

  get courseInfos(): CourseInfo[] {
    let courseInfosCookieKey: string =
      `${this.primaryUserIdTermIdentifier}.${UserService._courseInfosCookieKeySuffix}`;
    let courseInfos: CourseInfo[] = this._$cookies.getObject(courseInfosCookieKey);
    if (!courseInfos) {
      courseInfosCookieKey =
        `${this.primaryUserId}.${UserService._courseInfosCookieKeySuffix}`;
      courseInfos = this._$cookies.getObject(courseInfosCookieKey);
    }

    return courseInfos || [];
  }
  set courseInfos(newCourseInfos: CourseInfo[]) {
    let courseInfosCookieKey: string =
      `${this.primaryUserIdTermIdentifier}.${UserService._courseInfosCookieKeySuffix}`;
    this._$cookies.putObject(courseInfosCookieKey, newCourseInfos, {
      expires: this._cookieExpiryDate
    });
  }

  get savedScheduleIds(): string[] {
    let savedScheduleIdsCookieKey: string =
      `${this.primaryUserIdTermIdentifier}.${UserService._savedScheduleIdsCookieKeySuffix}`;
    let savedScheduleIds: string[] = this._$cookies.getObject(savedScheduleIdsCookieKey);
    if (!savedScheduleIds) {
      savedScheduleIdsCookieKey =
        `${this.primaryUserId}.${UserService._savedScheduleIdsCookieKeySuffix}`;
      savedScheduleIds = this._$cookies.getObject(savedScheduleIdsCookieKey);
    }

    return savedScheduleIds || [];
  }
  set savedScheduleIds(newSavedScheduleIds: string[]) {
    const savedScheduleIdsCookieKey: string =
      `${this.primaryUserIdTermIdentifier}.${UserService._savedScheduleIdsCookieKeySuffix}`;
    this._$cookies.putObject(savedScheduleIdsCookieKey, newSavedScheduleIds, {
      expires: this._cookieExpiryDate
    });
  }
}

angular.module('berkeleyScheduler').service('userService', [
  '$cookies',
  '$q',
  UserService
]);

