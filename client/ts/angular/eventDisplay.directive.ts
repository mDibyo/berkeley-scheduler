import angular = require('angular');

import BaseCtrl = require('./_base.controller');
import IScheduleService = require('./schedule.service');


function bsEventDisplayDirective() {
  class bsEventDisplayCtrl extends BaseCtrl {
    // constructor($state: angular.ui.IStateService,
    //             $window: angular.IWindowService,
    //             // $scope: angular.IScope,
    //             scheduleFactory: IScheduleService) {
    //   super($state, $window, scheduleFactory);
    // }
  }

  return {
    scope: {
      event: '='
    },
    controller: [
        '$state',
        '$window',
        // '$scope',
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
