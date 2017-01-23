import angular = require('angular');

import BaseCtrl = require('./_base.controller');
import IScheduleService = require('./schedule.service');

class ConfirmEventDeleteDialogCtrl extends BaseCtrl {
  constructor(
      $state: angular.ui.IStateService,
      $window: angular.IWindowService,
      private $mdDialog: angular.material.IDialogService,
      scheduleFactory: IScheduleService,
      public eventName: string,
      private onConfirm: () => void,
  ) {
    super($state, $window, scheduleFactory);
  }

  complete(confirm: boolean) {
    if (confirm) {
      this.onConfirm();
    }

    this.$mdDialog.hide();
  }
}
angular.module('berkeleyScheduler').controller('ConfirmEventDeleteDialogCtrl', [
    '$state',
    '$window',
    '$mdDialog',
    'scheduleFactory',
    'eventName',
    'onConfirm',
    ConfirmEventDeleteDialogCtrl
]);
