import angular = require('angular');
import angulartics = require('angulartics')

import BaseCtrl = require('./_base.controller');
import IScheduleService = require('./schedule.service');
import EventService from './event.service';
import CustomCommitment from '../models/customCommitment';

export class ViewEventCtrl extends BaseCtrl {
  selectedEvent?: CustomCommitment;

  constructor(
      $state: angular.ui.IStateService,
      $window: angular.IWindowService,
      $location: angular.ILocationService,
      $stateParams: angular.ui.IStateParamsService & {id: string},
      eventService: EventService,
      scheduleFactory: IScheduleService,
      $analytics: angulartics.angulartics.IAnalyticsService
  ) {
    super($state, $window, scheduleFactory);

    $analytics.pageTrack($location.url());

    this.selectedEvent = eventService.getEventById($stateParams.id);
  }
}
angular.module('berkeleyScheduler').controller('ViewEventCtrl', [
    '$state',
    '$window',
    '$location',
    '$stateParams',
    'eventService',
    'scheduleFactory',
    '$analytics',
    ViewEventCtrl
]);
