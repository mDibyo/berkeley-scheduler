import angular = require('angular');

import constants = require('../constants');
import {Days, StringMap} from '../utils';

import Time = require('../models/time');
import CustomCommitment from '../models/customCommitment';
import Meeting from '../models/meeting';
import CustomCommitmentOption from '../models/customCommitmentOption';
import {generateRandomAlphaNumericId} from '../utils';


export interface Preferences {
  showMobUnoptDialog: boolean;
  showConfirmEventDeleteDialog: boolean;
}

export interface UserState {
  timeSpent: number; // seconds
}

export interface SchedulingOptions extends StringMap<any> {
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
  doSkipNav: boolean;
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

  private static _primaryUserIdStorageKey = 'primaryUserId';
  private static _preferencesStorageKeySuffix = 'preferences';
  private static _stateStorageKeySuffix = 'state';
  private static _schedulingOptionsStorageKeySuffix = 'schedulingOptions';
  private static _courseInfosStorageKeySuffix = 'addedCourses';
  private static _eventInfosStorageKeySuffix = 'addedEvents';
  private static _savedScheduleIdsStorageKeySuffix = 'savedScheduleIds';

  private _primaryUserId: string;
  private _preferences: Preferences;
  private _state: UserState;

  constructor(
      $cookies: angular.cookies.ICookiesService,
      localStorageService: angular.local.storage.ILocalStorageService,
  ) {
    this.storage = new AngularCompositeStorage($cookies, localStorageService);
  }

  private get primaryUserId(): string {
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

  getPrimaryUserIdTermIdentifier(termAbbrev: string): string {
    return `${this.primaryUserId}.${termAbbrev}`;
  }

  private getTermIdentifiedStorageValue<V>(termAbbrev: string, keySuffix: string): V[] {
    let storageKey: string = `${this.getPrimaryUserIdTermIdentifier(termAbbrev)}.${keySuffix}`;
    let value: V[] = this.storage.get(storageKey);

    if (!value) {
      storageKey = `${this.primaryUserId}.${keySuffix}`;
      value = this.storage.get(storageKey);
    }

    return value || [];
  }

  get state(): UserState {
    if (!this._state) {
      const stateStorageKey: string =
          `${this.primaryUserId}.${UserService._stateStorageKeySuffix}`;
      let state: UserState = this.storage.get(stateStorageKey);
      this._state = angular.extend({
        timeSpent: 0
      }, state);
    }

    return angular.copy(this._state);
  }
  set state(newState: UserState) {
    this._state = newState;
    const stateStorageKey: string =
        `${this.primaryUserId}.${UserService._stateStorageKeySuffix}`;
    this.storage.set(stateStorageKey, newState);
  }
  setState(stateKey: string, stateValue: any) {
    this.state = angular.extend(this._state, {
      [stateKey]: stateValue
    });
  }

  get preferences(): Preferences {
    if (!this._preferences) {
      const preferencesStorageKey: string =
          `${this.primaryUserId}.${UserService._preferencesStorageKeySuffix}`;
      let preferences: Preferences = this.storage.get(preferencesStorageKey);
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
    const schedulingOptionsStorageKey: string =
      `${this.primaryUserId}.${UserService._schedulingOptionsStorageKeySuffix}`;
    return this.storage.get(schedulingOptionsStorageKey) || {};
  }
  set schedulingOptions(newSchedulingOptions: SchedulingOptions) {
    const schedulingOptionsStorageKey: string =
      `${this.primaryUserId}.${UserService._schedulingOptionsStorageKeySuffix}`;
    this.storage.set(schedulingOptionsStorageKey, newSchedulingOptions);
  }

  getCourseInfos(termAbbrev: string): CourseInfo[] {
    return this.getTermIdentifiedStorageValue<CourseInfo>(
        termAbbrev,
        UserService._courseInfosStorageKeySuffix
    );
  }
  setCourseInfos(termAbbrev: string, newCourseInfos: CourseInfo[]) {
    let courseInfosStorageKey: string =
      `${this.getPrimaryUserIdTermIdentifier(termAbbrev)}.${UserService._courseInfosStorageKeySuffix}`;
    this.storage.set(courseInfosStorageKey, newCourseInfos);
  }

  getEvents(termAbbrev: string): CustomCommitment[] {
    const eventInfos =
        this.getTermIdentifiedStorageValue<EventInfo>(termAbbrev, UserService._eventInfosStorageKeySuffix);

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
  setEvents(termAbbrev: string, newEvents: CustomCommitment[]) {
    let eventInfosStorageKey: string =
        `${this.getPrimaryUserIdTermIdentifier(termAbbrev)}.${UserService._eventInfosStorageKeySuffix}`;
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

  getSavedScheduleIds(termAbbrev: string): string[] {
    return this.getTermIdentifiedStorageValue<string>(
        termAbbrev,
        UserService._savedScheduleIdsStorageKeySuffix
    );
  }
  setSavedScheduleIds(termAbbrev: string, newSavedScheduleIds: string[]) {
    const savedScheduleIdsStorageKey: string =
      `${this.getPrimaryUserIdTermIdentifier(termAbbrev)}.${UserService._savedScheduleIdsStorageKeySuffix}`;
    this.storage.set(savedScheduleIdsStorageKey, newSavedScheduleIds);
  }
}

angular.module('berkeleyScheduler').service('userService', [
    '$cookies',
    'localStorageService',
    '$q',
  UserService
]);

