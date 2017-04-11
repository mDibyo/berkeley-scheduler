import angular = require('angular');

import BaseCtrl = require("./_base.controller");
import {ScheduleGenerationStatus} from "../models/scheduleGenerationStatus";
import IScheduleService = require("./schedule.service");
import SchedulingOptionsService from "./schedulingOptions.service";
import {TERM_ABBREV} from "../constants";

function bsGenerateSchedulesDirective() {
  class bsGenerateSchedulesCtrl extends BaseCtrl {
    scheduleGenerationStatus: ScheduleGenerationStatus;

    constructor(
        $state: angular.ui.IStateService,
        $window: angular.IWindowService,
        schedulingOptionsService: SchedulingOptionsService,
        private scheduleFactory: IScheduleService
    ) {
      super($state, $window, schedulingOptionsService);

      this.scheduleGenerationStatus = this.scheduleFactory.getScheduleGenerationStatus();

      this.scheduleFactory.registerScheduleGenerationStatusListener('generateSchedules', status => {
        this.scheduleGenerationStatus = status;
        if (status.status === 'stale' && $state.includes('schedule.viewSchedule')) {
          this.generateAndViewSchedules();
        }
      });
    }

    generateAndViewSchedules() {
      this.scheduleFactory.getCurrentScheduleGroupIdQ(TERM_ABBREV).then(scheduleGroupId => {
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
        'schedulingOptionsService',
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
