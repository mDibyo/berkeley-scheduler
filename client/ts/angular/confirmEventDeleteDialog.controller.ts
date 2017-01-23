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
      private onConfirm: () => void,
  ) {
    super($state, $window, scheduleFactory);

    this.doNotShowConfirmEventDeleteDialog = !this.userService.preferences.showConfirmEventDeleteDialog;
  }

  complete(confirm: boolean) {
    if (confirm) {
      this.onConfirm();
    }

    this.userService.setPreference('showConfirmEventDeleteDialog', !this.doNotShowConfirmEventDeleteDialog);
    this.$mdDialog.hide();
  }
}
angular.module('berkeleyScheduler').controller('ConfirmEventDeleteDialogCtrl', [
    '$state',
    '$window',
    '$mdDialog',
    'userService',
    'scheduleFactory',
    'eventName',
    'onConfirm',
    ConfirmEventDeleteDialogCtrl
]);
