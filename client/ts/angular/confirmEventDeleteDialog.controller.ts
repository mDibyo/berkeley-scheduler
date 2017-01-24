import angular = require('angular');

import BaseCtrl = require('./_base.controller');
import IScheduleService = require('./schedule.service');
import UserService from './user.service';

class ConfirmEventDeleteDialogCtrl extends BaseCtrl {
  doNotShowConfirmEventDeleteDialog: boolean = false;

  constructor(
      $state: angular.ui.IStateService,
      $window: angular.IWindowService,
      private $mdDialog: angular.material.IDialogService,
      private userService: UserService,
      scheduleFactory: IScheduleService,
      public eventName: string,
  ) {
    super($state, $window, scheduleFactory);

    this.doNotShowConfirmEventDeleteDialog = !this.userService.preferences.showConfirmEventDeleteDialog;
  }

  complete(confirm: boolean) {
    this.userService.setPreference('showConfirmEventDeleteDialog', !this.doNotShowConfirmEventDeleteDialog);
    confirm ? this.$mdDialog.hide() : this.$mdDialog.cancel();
  }
}
angular.module('berkeleyScheduler').controller('ConfirmEventDeleteDialogCtrl', [
    '$state',
    '$window',
    '$mdDialog',
    'userService',
    'scheduleFactory',
    'eventName',
    ConfirmEventDeleteDialogCtrl
]);
