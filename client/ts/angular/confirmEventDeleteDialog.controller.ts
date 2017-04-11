import angular = require('angular');

import BaseCtrl = require('./_base.controller');
import UserService from './user.service';
import SchedulingOptionsService from "./schedulingOptions.service";

class ConfirmEventDeleteDialogCtrl extends BaseCtrl {
  doNotShowConfirmEventDeleteDialog: boolean = false;

  constructor(
      $state: angular.ui.IStateService,
      $window: angular.IWindowService,
      private $mdDialog: angular.material.IDialogService,
      private userService: UserService,
      schedulingOptionsService: SchedulingOptionsService,
      public eventName: string,
      private onConfirm: () => void,
  ) {
    super($state, $window, schedulingOptionsService);

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
    'schedulingOptionsService',
    'eventName',
    'onConfirm',
    ConfirmEventDeleteDialogCtrl
]);
