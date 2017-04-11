import angular = require('angular');

import Schedule from '../models/schedule';
import {SchedulingOptions} from './user.service';
import {ScheduleGenerationStatus} from "../models/scheduleGenerationStatus";


declare interface IScheduleService {
  setStale(stale?: boolean): void;
  getScheduleQById(termAbbrev: string, scheduleId: string): angular.IPromise<Schedule>;

  getCurrentScheduleGroupIdQ(termAbbrev: string): angular.IPromise<string>;
  getCurrScheduleId(): string;

  getScheduleGenerationStatus(): ScheduleGenerationStatus;
  registerScheduleGenerationStatusListener(
      tag: string,
      listener: (status: ScheduleGenerationStatus) => void
  ): void;
}

export = IScheduleService;
