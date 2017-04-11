import angular = require('angular');

import UserService from "./user.service";
import {addListener, Listener, ListenerMap, TermMap} from "../utils";
import Schedule from "../models/schedule";
import {DEFAULT_TERM_ABBREV} from "../constants";
import IScheduleService = require("./schedule.service");

export default class SavedScheduleService {
  constructor(
      private $q: angular.IQService,
      private userService: UserService,
      private scheduleFactory: IScheduleService
  ) {
    this.readyQByTerm.get(DEFAULT_TERM_ABBREV);
  }

  private readyQByTerm: TermMap<angular.IPromise<void>> = new TermMap(
      termAbbrev => this.$q.all(this.userService.getSavedScheduleIds(termAbbrev).map(
          scheduleId => this.scheduleFactory
              .getScheduleQById(termAbbrev, scheduleId)
              .then(schedule => this.addSavedSchedule(termAbbrev, schedule))
      )).then(() => {})
  );

  private savedSchedulesByTerm: TermMap<Schedule[]> = new TermMap(() => ([]));

  private addSavedScheduleListenersByTerm: TermMap<ListenerMap<Schedule>> = new TermMap(() => ({}));
  private dropSavedScheduleListenersByTerm: TermMap<ListenerMap<Schedule>> = new TermMap(() => ({}));

  addAddSavedScheduleListener(termAbbrev: string, tag: string, listener: Listener<Schedule>) {
    addListener<Schedule>(this.addSavedScheduleListenersByTerm.get(termAbbrev), tag, listener);
  }

  addDropSavedScheduleListener(termAbbrev: string, tag: string, listener: Listener<Schedule>) {
    addListener<Schedule>(this.dropSavedScheduleListenersByTerm.get(termAbbrev), tag, listener);
  }

  getAllSavedSchedulesQ(termAbbrev: string): angular.IPromise<Schedule[]> {
    return this.readyQByTerm.get(termAbbrev).then(() => this.savedSchedulesByTerm.get(termAbbrev).slice());
  }

  addSavedSchedule(termAbbrev: string, schedule: Schedule) {
    // Check if schedule has already been added.
    const savedSchedules = this.savedSchedulesByTerm.get(termAbbrev);
    const scheduleIdx = savedSchedules.findIndex(s => schedule.id === s.id);
    if (scheduleIdx >= 0) {
      return;
    }

    // Add otherwise.
    savedSchedules.push(schedule);
    this.save(termAbbrev);

    const addSavedScheduleListeners = this.addSavedScheduleListenersByTerm.get(termAbbrev);
    for (const tag in addSavedScheduleListeners) {
      addSavedScheduleListeners[tag](schedule);
    }
  }

  dropSavedSchedule(termAbbrev: string, schedule: Schedule) {
    // Check if schedule has been saved.
    const savedSchedules = this.savedSchedulesByTerm.get(termAbbrev);
    const scheduleIdx = savedSchedules.findIndex(s => schedule.id === s.id);
    if (scheduleIdx < 0) {
      return;
    }

    // If so, drop it.
    savedSchedules.splice(scheduleIdx, 1);
    this.save(termAbbrev);

    const dropSavedScheduleListeners = this.dropSavedScheduleListenersByTerm.get(termAbbrev);
    for (const tag in dropSavedScheduleListeners) {
      dropSavedScheduleListeners[tag](schedule);
    }
  }

  save(termAbbrev: string) {
    this.userService.setSavedScheduleIds(termAbbrev, this.savedSchedulesByTerm.get(termAbbrev).map(
        savedSchedule => savedSchedule.id
    ));
  }
}
angular.module('berkeleyScheduler').service('savedScheduleService', [
    '$q',
    'userService',
    'scheduleFactory',
    SavedScheduleService
]);
