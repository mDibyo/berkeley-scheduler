import angular = require('angular');

import constants = require('../constants');
import {Days} from '../utils';

import Time = require('../models/time');
import CustomCommitment from '../models/customCommitment';
import Meeting from '../models/meeting';
import CustomCommitmentOption from '../models/customCommitmentOption';
import {generateRandomAlphaNumericId} from '../utils';


export interface TimeInfo {
  hours: number,
  minutes: number
}

export interface Preferences {
  showMobUnoptDialog: boolean;
  showConfirmEventDeleteDialog: boolean;
  showSendEmailDialog: boolean;

  isRegistered: boolean;
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
  dayStartTime: TimeInfo;
  dayEndTime: TimeInfo;
  noTimeConflicts: boolean;
  showFinalsSchedule: boolean;
}

export interface CourseInfo {
  id: string;
  selected: boolean;
  selectedSections: string[];
  unselectedSections: string[];
}

export interface EventMeetingInfo {
  id: string;
  startTime: TimeInfo;
  endTime: TimeInfo;
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

  private static _primaryUserIdStorageKey = 'primaryUserId';
  private static _preferencesStorageKeySuffix = 'preferences';
  private static _schedulingOptionsStorageKeySuffix = 'schedulingOptions';
  private static _courseInfosStorageKeySuffix = 'addedCourses';
  private static _eventInfosStorageKeySuffix = 'addedEvents';
  private static _savedScheduleIdsStorageKeySuffix = 'savedScheduleIds';

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

  get primaryUserId(): string {
    if (!this._primaryUserId) {
      let primaryUserId = this.storage.get(UserService._primaryUserIdStorageKey);
      if (primaryUserId === undefined) {
        primaryUserId = generateRandomAlphaNumericId(10);
      }
      this.storage.set(UserService._primaryUserIdStorageKey, primaryUserId);
      this._primaryUserId = primaryUserId;
    }

    return this._primaryUserId;
  }

  get primaryUserIdTermIdentifier(): string {
    return `${this.primaryUserId}.${constants.TERM_ABBREV}`;
  }

  private getTermIdentifiedStorageValue<V>(keySuffix: string): V[] {
    let storageKey: string = `${this.primaryUserIdTermIdentifier}.${keySuffix}`;
    let value: V[] = this.storage.get(storageKey);

    if (!value) {
      storageKey = `${this.primaryUserId}.${keySuffix}`;
      value = this.storage.get(storageKey);
    }

    return value || [];
  }

  get preferences(): Preferences {
    if (!this._preferences) {
      const preferencesStorageKey: string =
          `${this.primaryUserId}.${UserService._preferencesStorageKeySuffix}`;
      let preferences: Preferences = this.storage.get(preferencesStorageKey);
      preferences = angular.extend({
        showMobUnoptDialog: true,
        showConfirmEventDeleteDialog: true,
        showSendEmailDialog: true,

        isRegistered: false
      }, preferences);
      this._preferences = preferences;
    }

    return angular.copy(this._preferences);
  }
  set preferences(newPreferences: Preferences) {
    this._preferences = newPreferences;
    const preferencesStorageKey: string =
      `${this.primaryUserId}.${UserService._preferencesStorageKeySuffix}`;
    this.storage.set(preferencesStorageKey, newPreferences);
  }
  setPreference(preference: string, choice: any) {
    this.preferences = angular.extend(this._preferences, {
      [preference]: choice
    });
  }

  get schedulingOptions(): SchedulingOptions {
    if (!this._schedulingOptions) {
      const schedulingOptionsStorageKey: string =
        `${this.primaryUserId}.${UserService._schedulingOptionsStorageKeySuffix}`;
      let schedulingOptions: SchedulingOptions =
          this.storage.get(schedulingOptionsStorageKey) || {};

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
        const startTime: TimeInfo = schedulingOptions.dayStartTime;
        schedulingOptions.dayStartTime = new Time(startTime.hours, startTime.minutes);
      }
      if (schedulingOptions.dayEndTime) {
        const endTime: TimeInfo = schedulingOptions.dayEndTime;
        schedulingOptions.dayEndTime = new Time(endTime.hours, endTime.minutes);
      }

      this._schedulingOptions = schedulingOptions;
    }

    return angular.copy(this._schedulingOptions);
  }
  set schedulingOptions(newSchedulingOptions: SchedulingOptions) {
    this._schedulingOptions = newSchedulingOptions;
    const schedulingOptionsStorageKey: string =
      `${this.primaryUserId}.${UserService._schedulingOptionsStorageKeySuffix}`;
    this.storage.set(schedulingOptionsStorageKey, newSchedulingOptions);
  }
  setSchedulingOption(option: string, choice: any) {
    this.schedulingOptions = angular.extend(this._schedulingOptions, {
      [option]: choice
    });
  }

  get courseInfos(): CourseInfo[] {
    return this.getTermIdentifiedStorageValue<CourseInfo>(UserService._courseInfosStorageKeySuffix);
  }
  set courseInfos(newCourseInfos: CourseInfo[]) {
    let courseInfosStorageKey: string =
      `${this.primaryUserIdTermIdentifier}.${UserService._courseInfosStorageKeySuffix}`;
    this.storage.set(courseInfosStorageKey, newCourseInfos);
  }

  get events(): CustomCommitment[] {
    const eventInfos =
        this.getTermIdentifiedStorageValue<EventInfo>(UserService._eventInfosStorageKeySuffix);

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
    let eventInfosStorageKey: string =
        `${this.primaryUserIdTermIdentifier}.${UserService._eventInfosStorageKeySuffix}`;
    this.storage.set(eventInfosStorageKey, newEvents.map((event: CustomCommitment) => {
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
    return this.getTermIdentifiedStorageValue<string>(UserService._savedScheduleIdsStorageKeySuffix);
  }
  set savedScheduleIds(newSavedScheduleIds: string[]) {
    const savedScheduleIdsStorageKey: string =
      `${this.primaryUserIdTermIdentifier}.${UserService._savedScheduleIdsStorageKeySuffix}`;
    this.storage.set(savedScheduleIdsStorageKey, newSavedScheduleIds);
  }
}

angular.module('berkeleyScheduler').service('userService', [
    '$cookies',
    'localStorageService',
    '$q',
  UserService
]);

