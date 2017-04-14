import angular = require('angular');

import BaseCtrl = require("./_base.controller");
import UserService from "./user.service";
import SchedulingOptionsService from "./schedulingOptions.service";

class ShareDialogCtrl extends BaseCtrl {
  doNotShowShareDialog: boolean = false;

  constructor(
      $state: angular.ui.IStateService,
      $window: angular.IWindowService,
      private $mdDialog: angular.material.IDialogService,
      private userService: UserService,
      schedulingOptionsService: SchedulingOptionsService
  ) {
    super($state, $window, schedulingOptionsService);
  }

  close() {
    this.userService.setPreference('showShareDialog', !this.doNotShowShareDialog);
    this.$mdDialog.hide();
  }
}
angular.module('berkeleyScheduler').controller('ShareDialogCtrl', [
  '$state',
  '$window',
  '$mdDialog',
  'userService',
  'schedulingOptionsService',
  ShareDialogCtrl
]);
