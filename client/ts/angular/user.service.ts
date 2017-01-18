import angular = require('angular');

import constants = require('../constants');
import {Days} from '../utils';

import Time = require('../models/time');
import Schedule = require('../models/schedule');
import {CustomCommitment} from '../models/customCommitment';
import Meeting from '../models/meeting';
import {CustomCommitmentOption} from '../models/customCommitmentOption';
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

export interface EventMeetingTimeInfo {
  hours: number,
  minutes: number
}

export interface EventMeetingInfo {
  startTime: EventMeetingTimeInfo;
  endTime: EventMeetingTimeInfo;
  days: Days;
  location: string;
}

export interface EventInfo {
  id: string;
  selected: boolean;
  name: string;
  optionId: string;
  meetings: EventMeetingInfo[];
}

export default class UserService {
  private _cookieExpiryDate = (() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date;
  })();
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
      private $cookies: angular.cookies.ICookiesService,
      private $q: angular.IQService,
  ) {}

  private get primaryUserId(): string {
    if (!this._primaryUserId) {
      let primaryUserId = this.$cookies.get(UserService._primaryUserIdCookieKey);
      if (primaryUserId === undefined) {
        primaryUserId = generateRandomAlphaNumericId(10);
        this.$cookies.put(UserService._primaryUserIdCookieKey, primaryUserId, {
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

  private getTermIdentifiedCookieValue<V>(keySuffix: string): V[] {
    let cookieKey: string = `${this.primaryUserIdTermIdentifier}.${keySuffix}`;
    let value: V[] = this.$cookies.getObject(cookieKey);

    if (!value) {
      cookieKey = `${this.primaryUserId}.${keySuffix}`;
      value = this.$cookies.getObject(cookieKey);
    }

    return value || [];
  }

  get preferences(): Preferences {
    if (!this._preferences) {
      const preferencesCookieKey: string =
          `${this.primaryUserId}.${UserService._preferencesCookieKeySuffix}`;
      let preferences: Preferences = this.$cookies.getObject(preferencesCookieKey);
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
    this.$cookies.putObject(preferencesCookieKey, newPreferences, {
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
        this.$cookies.getObject(schedulingOptionsCookieKey) || {};

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
    this.$cookies.putObject(schedulingOptionsCookieKey, newSchedulingOptions, {
      expires: this._cookieExpiryDate
    });
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
    this.$cookies.putObject(courseInfosCookieKey, newCourseInfos, {
      expires: this._cookieExpiryDate
    });
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
        return new Meeting<CustomCommitmentOption>(
            new Time(meetingInfo.startTime.hours, meetingInfo.startTime.minutes),
            new Time(meetingInfo.endTime.hours, meetingInfo.endTime.minutes),
            meetingInfo.days,
            meetingInfo.location,
            [],
        );
      });

      return event;
    })
  }
  set events(newEvents: CustomCommitment[]) {
    let eventInfosCookieKey: string =
        `${this.primaryUserIdTermIdentifier}.${UserService._eventInfosCookieKeySuffix}`;
    this.$cookies.putObject(eventInfosCookieKey, newEvents.map((event: CustomCommitment) => {
      return {
        id: event.id,
        selected: event.selected,
        name: event.getName(),
        optionId: event.option.id,
        meetings: event.option.meetings.map(meeting => ({
          startTime: {hours: meeting.startTime.hours, minutes: meeting.startTime.minutes},
          endTime: {hours: meeting.endTime.hours, minutes: meeting.endTime.minutes},
          days: meeting.days,
          location: meeting.location
        }))
      }
    }), {
      expires: this._cookieExpiryDate
    });
  }

  get savedScheduleIds(): string[] {
    return this.getTermIdentifiedCookieValue<string>(UserService._savedScheduleIdsCookieKeySuffix);
  }
  set savedScheduleIds(newSavedScheduleIds: string[]) {
    const savedScheduleIdsCookieKey: string =
      `${this.primaryUserIdTermIdentifier}.${UserService._savedScheduleIdsCookieKeySuffix}`;
    this.$cookies.putObject(savedScheduleIdsCookieKey, newSavedScheduleIds, {
      expires: this._cookieExpiryDate
    });
  }
}

angular.module('berkeleyScheduler').service('userService', [
  '$cookies',
  '$q',
  UserService
]);

