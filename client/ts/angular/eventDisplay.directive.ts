import angular = require('angular');

import BaseCtrl = require('./_base.controller');
import IScheduleService = require('./schedule.service');
import Meeting = require('../models/meeting');
import CustomCommitment from '../models/customCommitment';
import EventService from './event.service';
import SchedulingOptionsService from "./schedulingOptions.service";


interface eventDisplayDirectiveScope extends angular.IScope {
  event: CustomCommitment
}

function bsEventDisplayDirective() {
  class bsEventDisplayCtrl extends BaseCtrl {
    constructor(
        $state: angular.ui.IStateService,
        $window: angular.IWindowService,
        private $scope: eventDisplayDirectiveScope,
        private $stateParams: angular.ui.IStateParamsService,
        private eventService: EventService,
        schedulingOptionsService: SchedulingOptionsService,
        private scheduleFactory: IScheduleService
    ) {
      super($state, $window, schedulingOptionsService);
    }

    addMeeting() {
      this.$scope.event.addMeeting();
      this.setScheduleStale();
      this.eventService.save(this.$stateParams.termAbbrev);
    }

    saveMeeting() {
      this.eventService.save(this.$stateParams.termAbbrev);
    }

    setScheduleStale() {
      this.scheduleFactory.setStale(true);
    }
  }

  return {
    scope: {
      event: '='
    },
    controller: [
        '$state',
        '$window',
        '$scope',
        '$stateParams',
        'eventService',
        'schedulingOptionsService',
        'scheduleFactory',
        bsEventDisplayCtrl
    ],
    controllerAs: 'vm',
    templateUrl: 'assets/static/html/event_display.partial.html'
  }
}
angular.module('berkeleyScheduler').directive('bsEventDisplay', [
    bsEventDisplayDirective
]);
