import angular = require('angular');
import angulartics = require('angulartics')

import BaseCtrl = require('./_base.controller');
import IScheduleService = require('./schedule.service');

export class ViewEventCtrl extends BaseCtrl {
  constructor(
      $state: angular.ui.IStateService,
      $window: angular.IWindowService,
      $location: angular.ILocationService,
      // $stateParams: angular.ui.IStateParamsService,
      scheduleFactory: IScheduleService,
      $analytics: angulartics.angulartics.IAnalyticsService
  ) {
    super($state, $window, scheduleFactory);

    $analytics.pageTrack($location.url());
  }
}
angular.module('berkeleyScheduler').controller('ViewEventCtrl', [
  '$state',
  '$window',
  '$location',
  // '$stateParams',
  'scheduleFactory',
  '$analytics',
  ViewEventCtrl
]);
