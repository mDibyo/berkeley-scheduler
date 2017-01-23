import angular = require('angular');

import BaseCtrl = require('./_base.controller');
import IScheduleService = require('./schedule.service');
import Meeting = require('../models/meeting');
import CustomCommitment from '../models/customCommitment';
import EventService from './event.service';


interface eventDisplayDirectiveScope extends angular.IScope {
  event: CustomCommitment
}

function bsEventDisplayDirective() {
  class bsEventDisplayCtrl extends BaseCtrl {
    constructor(
        $state: angular.ui.IStateService,
        $window: angular.IWindowService,
        private $scope: eventDisplayDirectiveScope,
        private eventService: EventService,
        private scheduleFactory: IScheduleService
    ) {
      super($state, $window, scheduleFactory);
    }

    addMeeting() {
      console.log('add');
      this.$scope.event.addMeeting();
      this.setScheduleStale();
      this.eventService.save();
    }

    saveMeeting() {
      console.log('save');
      this.eventService.save();
    }

    setScheduleStale() {
      console.log('stale');
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
        'eventService',
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
