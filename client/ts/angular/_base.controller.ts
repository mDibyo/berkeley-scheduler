import angular = require('angular');

import IScheduleService = require('./schedule.service');

class BaseCtrl {
  private _$state: angular.ui.IStateService;
  private _$window: angular.IWindowService;
  private _scheduleFactory: IScheduleService;

  constructor(
      $state: angular.ui.IStateService,
      $window: angular.IWindowService,
      scheduleFactory: IScheduleService
  ) {
    this._$state = $state;
    this._$window = $window;
    this._scheduleFactory = scheduleFactory;
  }

  goToState(to: string, params: any, options: angular.ui.IHrefOptions) {
    if (to === 'schedule.viewSchedule') {
      this._goToScheduleViewSchedule(params, options);
      return;
    }
    this._$state.go(to, params, options);
  }

  goToExternal(href: string) {
    this._$window.open(href, '_blank');
  }

  private _goToScheduleViewSchedule(params: any, options: angular.ui.IHrefOptions) {
    const schedulingOptions = this._scheduleFactory.getSchedulingOptions();
    params.noTimeConflicts = schedulingOptions.noTimeConflicts;
    this._$state.go('schedule.viewSchedule', params, options);
  }

  getHref(state: angular.ui.IState, params: any, options: angular.ui.IHrefOptions) {
    return 'https://berkeleyscheduler.com/' + this._$state.href(state, params, options);
  }
}

export = BaseCtrl;
