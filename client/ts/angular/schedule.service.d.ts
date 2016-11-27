import angular = require('angular');

import Schedule = require('../models/schedule');


interface IScheduleService {
  setStale(stale?: boolean): void;
  getScheduleQById(scheduleId: string): angular.IPromise<Schedule>;
}

export default IScheduleService;
