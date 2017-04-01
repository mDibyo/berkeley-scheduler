import angular = require('angular');

import BaseCtrl = require("./_base.controller");
import {ScheduleGenerationStatus} from "../models/scheduleGenerationStatus";
import IScheduleService = require("./schedule.service");

function bsGenerateSchedulesDirective() {
  class bsGenerateSchedulesCtrl extends BaseCtrl {
    scheduleGenerationStatus: ScheduleGenerationStatus;

    constructor(
        $state: angular.ui.IStateService,
        $window: angular.IWindowService,
        scheduleFactory: IScheduleService
    ) {
      super($state, $window, scheduleFactory);

      this.scheduleGenerationStatus = this.scheduleFactory.getScheduleGenerationStatus();

      this.scheduleFactory.registerScheduleGenerationStatusListener('generateSchedules', status => {
        this.scheduleGenerationStatus = status;
        if (status.status === 'stale' && $state.includes('schedule.viewSchedule')) {
          this.generateAndViewSchedules();
        }
      });
    }

    generateAndViewSchedules() {
      this.scheduleFactory.getCurrentScheduleGroupIdQ().then(scheduleGroupId => {
        this.goToState('schedule.generatingSchedules', {
          scheduleGroupId
        });
      });
    }

    viewSchedules() {
      const currScheduleId = this.scheduleFactory.getCurrScheduleId();
      if (currScheduleId === undefined) {
        this.generateAndViewSchedules();
        return;
      }
      this.goToState('schedule.viewSchedule', {
        scheduleId: currScheduleId
      });
    }
  }
  return {
    controller: [
        '$state',
        '$window',
        'scheduleFactory',
        bsGenerateSchedulesCtrl
    ],
    controllerAs: 'gSBCtrl',
    templateUrl: 'assets/static/html/generate_schedules.partial.html'
  }
}
angular.module('berkeleyScheduler').directive('bsGenerateSchedules', [
    bsGenerateSchedulesDirective
]);
