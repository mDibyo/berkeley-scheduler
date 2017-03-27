import angular = require('angular');

import BaseCtrl = require("./_base.controller");
import {ScheduleGenerationStatus} from "../models/scheduleGenerationStatus";
import IScheduleService = require("./schedule.service");

function bsGenerateSchedulesButtonDirective() {
  class bsGenerateSchedulesButtonCtrl extends BaseCtrl {
    scheduleGenerationStatus: ScheduleGenerationStatus;

    constructor(
        $state: angular.ui.IStateService,
        $window: angular.IWindowService,
        private scheduleFactory: IScheduleService
    ) {
      super($state, $window, scheduleFactory);

      this.scheduleGenerationStatus = this.scheduleFactory.getScheduleGenerationStatus();

      this.scheduleFactory.registerScheduleGenerationStatusListener('generateSchedulesButton', status => {
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
        bsGenerateSchedulesButtonCtrl
    ],
    controllerAs: 'gSBCtrl',
    templateUrl: 'assets/static/html/generate_schedules_button.partial.html'
  }
}
angular.module('berkeleyScheduler').directive('bsGenerateSchedulesButton', [
    bsGenerateSchedulesButtonDirective
]);
