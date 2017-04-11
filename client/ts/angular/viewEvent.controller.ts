import angular = require('angular');
import {angulartics} from "angulartics";

import BaseCtrl = require('./_base.controller');
import EventService from './event.service';
import CustomCommitment from '../models/customCommitment';
import SchedulingOptionsService from "./schedulingOptions.service";

export class ViewEventCtrl extends BaseCtrl {
  selectedEvent?: CustomCommitment;

  constructor(
      $state: angular.ui.IStateService,
      $window: angular.IWindowService,
      $location: angular.ILocationService,
      $stateParams: angular.ui.IStateParamsService & {id: string},
      eventService: EventService,
      schedulingOptionsService: SchedulingOptionsService,
      $analytics: angulartics.IAnalyticsService
  ) {
    super($state, $window, schedulingOptionsService);

    $analytics.pageTrack($location.url());

    this.selectedEvent = eventService.getEventById($stateParams.termAbbrev, $stateParams.id);
  }
}
angular.module('berkeleyScheduler').controller('ViewEventCtrl', [
    '$state',
    '$window',
    '$location',
    '$stateParams',
    'eventService',
    'schedulingOptionsService',
    '$analytics',
    ViewEventCtrl
]);
