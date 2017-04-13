import angular = require('angular');

import UserService, {SchedulingOptions} from "./user.service";
import {addListener, Listener, ListenerMap} from "../utils";
import Time = require("../models/time");

export default class SchedulingOptionsService {
  private schedulingOptions: SchedulingOptions;

  constructor(
      private userService: UserService
  ) {
    this.schedulingOptions = angular.extend({
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
    }, this.userService.schedulingOptions);


    if (this.schedulingOptions.dayStartTime) {
      const startTime: Time = this.schedulingOptions.dayStartTime;
      this.schedulingOptions.dayStartTime = new Time(startTime.hours, startTime.minutes);
    }
    if (this.schedulingOptions.dayEndTime) {
      const endTime: Time = this.schedulingOptions.dayEndTime;
      this.schedulingOptions.dayEndTime = new Time(endTime.hours, endTime.minutes);
    }
  }

  private changeSchedulingOptionListeners: ListenerMap<SchedulingOptions> = {};

  addChangeSchedulingOptionListener(tag: string, listener: Listener<SchedulingOptions>) {
    addListener<SchedulingOptions>(this.changeSchedulingOptionListeners, tag, listener);
  }

  getAllSchedulingOptions() {
    return angular.copy(this.schedulingOptions);
  }

  setSchedulingOption(option: string, choice: any, save: boolean=true) {
    this.schedulingOptions[option] = choice;
    if (save) {
      this.save();
    }

    for (const tag in this.changeSchedulingOptionListeners) {
      this.changeSchedulingOptionListeners[tag](this.getAllSchedulingOptions());
    }
  }

  private save() {
    this.userService.schedulingOptions = this.schedulingOptions;
  }
}
angular.module('berkeleyScheduler').service('schedulingOptionsService', [
    'userService',
    SchedulingOptionsService
]);
