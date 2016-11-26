import angular = require('angular');

import Schedule = require('../models/schedule');


interface IScheduleService {
  getScheduleQById(scheduleId: string): angular.IPromise<Schedule>;
}

export = IScheduleService;
