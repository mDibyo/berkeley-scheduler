import angular = require('angular');

import constants = require('../constants');
import {Days} from '../utils';

import Time = require('../models/time');
import CustomCommitment from '../models/customCommitment';
import Meeting from '../models/meeting';
import CustomCommitmentOption from '../models/customCommitmentOption';
import {generateRandomAlphaNumericId} from '../utils';


export interface Preferences {
  showMobUnoptDialog: boolean;
  showConfirmEventDeleteDialog: boolean;
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

export interface EventMeetingTimeInfo {
  hours: number,
  minutes: number
}

export interface EventMeetingInfo {
  id: string;
  startTime: EventMeetingTimeInfo;
  endTime: EventMeetingTimeInfo;
  days: Days<boolean>;
  location: string;
}

export interface EventInfo {
  id: string;
  selected: boolean;
  name: string;
  optionId: string;
  meetings: EventMeetingInfo[];
}

interface Storage {
  set(key: string, value: any): boolean;
  get(key: string): any|undefined;
}

class AngularCookieStorage implements Storage {
  private _cookieExpiryDate = (() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date;
  })();

  constructor(private $cookies: angular.cookies.ICookiesService) {}

  set(key: string, value: any): boolean {
    this.$cookies.putObject(key, value, {
      expires: this._cookieExpiryDate
    });
    return true;
  }

  get(key: string): any {
    try {
      return this.$cookies.getObject(key);
    } catch (SyntaxError) {
      return this.$cookies.get(key);
    }

  }
}

class AngularLocalStorage implements Storage {
  constructor(private localStorage: angular.local.storage.ILocalStorageService) {}

  set(key: string, value: any): boolean {
    return this.localStorage.set(key, value);
  }

  get(key: string): any {
    return this.localStorage.get(key);
  }
}

class AngularCompositeStorage implements Storage {
  private cookieStorage: AngularCookieStorage;
  private localStorage: AngularLocalStorage;

  constructor(
      $cookies: angular.cookies.ICookiesService,
      localStorage: angular.local.storage.ILocalStorageService
  ) {
    this.cookieStorage = new AngularCookieStorage($cookies);
    this.localStorage = new AngularLocalStorage(localStorage);
  }

  set(key: string, value: any): boolean {
    const done: boolean = this.localStorage.set(key, value);
    return done ? done : this.cookieStorage.set(key, value);
  }

  get(key: string): any {
    let value = this.localStorage.get(key);
    if (!value) {
      value = this.cookieStorage.get(key);
      this.localStorage.set(key, value);
    }
    return value;
  }
}

export default class UserService {
  private storage: Storage;

  private static _primaryUserIdCookieKey = 'primaryUserId';
  private static _preferencesCookieKeySuffix = 'preferences';
  private static _schedulingOptionsCookieKeySuffix = 'schedulingOptions';
  private static _courseInfosCookieKeySuffix = 'addedCourses';
  private static _eventInfosCookieKeySuffix = 'addedEvents';
  private static _savedScheduleIdsCookieKeySuffix = 'savedScheduleIds';

  private _primaryUserId: string;
  private _preferences: Preferences;
  private _schedulingOptions: SchedulingOptions;

  constructor(
      $cookies: angular.cookies.ICookiesService,
      localStorageService: angular.local.storage.ILocalStorageService,
      private $q: angular.IQService,
  ) {
    this.storage = new AngularCompositeStorage($cookies, localStorageService);
  }

  private get primaryUserId(): string {
    if (!this._primaryUserId) {
      let primaryUserId = this.storage.get(UserService._primaryUserIdCookieKey);
      if (primaryUserId === undefined) {
        primaryUserId = generateRandomAlphaNumericId(10);
      }
      this.storage.set(UserService._primaryUserIdCookieKey, primaryUserId);
      this._primaryUserId = primaryUserId;
    }

    return this._primaryUserId;
  }

  get primaryUserIdTermIdentifier(): string {
    return `${this.primaryUserId}.${constants.TERM_ABBREV}`;
  }

  private getTermIdentifiedCookieValue<V>(keySuffix: string): V[] {
    let cookieKey: string = `${this.primaryUserIdTermIdentifier}.${keySuffix}`;
    let value: V[] = this.storage.get(cookieKey);

    if (!value) {
      cookieKey = `${this.primaryUserId}.${keySuffix}`;
      value = this.storage.get(cookieKey);
    }

    return value || [];
  }

  get preferences(): Preferences {
    if (!this._preferences) {
      const preferencesCookieKey: string =
          `${this.primaryUserId}.${UserService._preferencesCookieKeySuffix}`;
      let preferences: Preferences = this.storage.get(preferencesCookieKey);
      preferences = angular.extend({
        showMobUnoptDialog: true,
        showConfirmEventDeleteDialog: true
      }, preferences);
      this._preferences = preferences;
    }

    return angular.copy(this._preferences);
  }
  set preferences(newPreferences: Preferences) {
    this._preferences = newPreferences;
    const preferencesCookieKey: string =
      `${this.primaryUserId}.${UserService._preferencesCookieKeySuffix}`;
    this.storage.set(preferencesCookieKey, newPreferences);
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
          this.storage.get(schedulingOptionsCookieKey) || {};

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
    this.storage.set(schedulingOptionsCookieKey, newSchedulingOptions);
  }
  setSchedulingOption(option: string, choice: any) {
    this.schedulingOptions = angular.extend(this._schedulingOptions, {
      [option]: choice
    });
  }

  get courseInfos(): CourseInfo[] {
    return this.getTermIdentifiedCookieValue<CourseInfo>(UserService._courseInfosCookieKeySuffix);
  }
  set courseInfos(newCourseInfos: CourseInfo[]) {
    let courseInfosCookieKey: string =
      `${this.primaryUserIdTermIdentifier}.${UserService._courseInfosCookieKeySuffix}`;
    this.storage.set(courseInfosCookieKey, newCourseInfos);
  }

  get events(): CustomCommitment[] {
    const eventInfos =
        this.getTermIdentifiedCookieValue<EventInfo>(UserService._eventInfosCookieKeySuffix);

    return eventInfos.map((eventInfo: EventInfo) => {
      const event = new CustomCommitment(eventInfo.name);
      event.id = eventInfo.id;
      event.selected = eventInfo.selected;
      event.option.id = eventInfo.optionId;
      event.option.meetings = eventInfo.meetings.map((meetingInfo: EventMeetingInfo) => {
        const meeting = new Meeting<CustomCommitmentOption>(
            new Time(meetingInfo.startTime.hours, meetingInfo.startTime.minutes),
            new Time(meetingInfo.endTime.hours, meetingInfo.endTime.minutes),
            meetingInfo.days,
            meetingInfo.location,
            [],
            event.option
        );
        meeting.id = meetingInfo.id;
        return meeting;
      });

      return event;
    })
  }
  set events(newEvents: CustomCommitment[]) {
    let eventInfosCookieKey: string =
        `${this.primaryUserIdTermIdentifier}.${UserService._eventInfosCookieKeySuffix}`;
    this.storage.set(eventInfosCookieKey, newEvents.map((event: CustomCommitment) => {
      return {
        id: event.id,
        selected: event.selected,
        name: event.getName(),
        optionId: event.option.id,
        meetings: event.option.meetings.map((meeting): EventMeetingInfo => ({
          id: meeting.id,
          startTime: {hours: meeting.startTime.hours, minutes: meeting.startTime.minutes},
          endTime: {hours: meeting.endTime.hours, minutes: meeting.endTime.minutes},
          days: meeting.days,
          location: meeting.location
        }))
      }
    }));
  }

  get savedScheduleIds(): string[] {
    return this.getTermIdentifiedCookieValue<string>(UserService._savedScheduleIdsCookieKeySuffix);
  }
  set savedScheduleIds(newSavedScheduleIds: string[]) {
    const savedScheduleIdsCookieKey: string =
      `${this.primaryUserIdTermIdentifier}.${UserService._savedScheduleIdsCookieKeySuffix}`;
    this.storage.set(savedScheduleIdsCookieKey, newSavedScheduleIds);
  }
}

angular.module('berkeleyScheduler').service('userService', [
    '$cookies',
    'localStorageService',
    '$q',
  UserService
]);

