import angular = require('angular');
import UserService from "./user.service";
import {addListener, Listener, ListenerMap} from "../utils";

const UPDATE_INTERVAL = 1; // seconds

class TimeSpentService {
  private currentStart: number = 0;
  private updateTimeSpentListeners: ListenerMap<number> = {};

  constructor(
      private $interval: angular.IIntervalService,
      private userService: UserService
  ) {}

  private timeSpent = this.userService.state.timeSpent;

  initialize() {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState == 'hidden') {
        this.stop();
        this.save();
      } else if (document.visibilityState === 'visible') {
        this.start();
      }
    });

    if (!document.hidden) {
      this.start();
    }

    this.$interval(() => {
      const current: number = this.save();

      for (const tag in this.updateTimeSpentListeners) {
        this.updateTimeSpentListeners[tag](current);
      }
    }, UPDATE_INTERVAL * 1000);
  }

  private start() {
    if (this.currentStart === 0) {
      this.currentStart = Date.now();
    }
  }

  private stop() {
    if (this.currentStart !== 0) {
      this.timeSpent = this.current;
      this.currentStart = 0;
    }
  }

  private getCurrentMeasurement(): number {
    if (this.currentStart === 0) {
      return 0;
    }

    return (Date.now() - this.currentStart) / 1000;
  }

  get current(): number {
    return this.timeSpent + this.getCurrentMeasurement();
  }

  private update() {
    this.stop();
    this.start()
  }

  addUpdateTimeSpentListener(tag: string, listener: Listener<number>) {
    addListener<number>(this.updateTimeSpentListeners, tag, listener);
  }

  save(): number {
    const current = this.current;
    this.userService.setState('timeSpent', current);
    return current;
  }
}
angular.module('berkeleyScheduler').service('timeSpentService', [
    '$interval',
    'userService',
    TimeSpentService
]);
