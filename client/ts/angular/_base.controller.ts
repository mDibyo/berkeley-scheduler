import angular = require('angular');

import SchedulingOptionsService from "./schedulingOptions.service";

class BaseCtrl {
  constructor(
      private $state: angular.ui.IStateService,
      private $window: angular.IWindowService,
      protected schedulingOptionsService: SchedulingOptionsService
  ) {}

  goToState(to: string, params: any={}, options?: angular.ui.IHrefOptions) {
    if (to === 'schedule.viewSchedule') {
      this._goToScheduleViewSchedule(params, options);
      return;
    }
    this.$state.go(to, params, options);
  }

  goToExternal(href: string) {
    this.$window.open(href, '_blank');
  }

  private _goToScheduleViewSchedule(params: any, options?: angular.ui.IHrefOptions) {
    const schedulingOptions = this.schedulingOptionsService.getAllSchedulingOptions();
    params.noTimeConflicts = schedulingOptions.noTimeConflicts;
    this.$state.go('schedule.viewSchedule', params, options);
  }

  getHref(state: angular.ui.IState, params: any, options: angular.ui.IHrefOptions) {
    return 'https://berkeleyscheduler.com/' + this.$state.href(state, params, options);
  }
}

export = BaseCtrl;
