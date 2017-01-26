import angular = require('angular');

import IScheduleService = require('./schedule.service');
import BaseCtrl = require('./_base.controller');
import UserService from './user.service';

interface NewUserRequestData {
  email: string;
  userId: string;
  firstName?: string;
  lastName?: string;
}

class SendEmailDialogCtrl extends BaseCtrl {
  doNotShowSendEmailDialog: boolean = false;

  firstName: string = '';
  lastName: string = '';
  email: string = '';

  constructor(
      $state: angular.ui.IStateService,
      $window: angular.IWindowService,
      private $mdDialog: angular.material.IDialogService,
      private $http: angular.IHttpService,
      private userService: UserService,
      scheduleFactory: IScheduleService
  ) {
    super($state, $window, scheduleFactory);

    this.doNotShowSendEmailDialog = !this.userService.preferences.showSendEmailDialog;
  }

  save() {
    const data: NewUserRequestData = {
      email: this.email,
      userId: this.userService.primaryUserId
    };
    if (this.firstName && this.firstName.length) {
      data.firstName = this.firstName;
    }
    if (this.lastName && this.lastName.length) {
      data.lastName = this.lastName;
    }

    this.$http.post('https://api.berkeleyscheduler.com/users', data).then(() => {
      this.userService.preferences.isRegistered = true;
    }, function() {
      console.log(arguments);
    });
  }

  send() {
    this.save();

    this.userService.setPreference('showSendEmailDialog', !this.doNotShowSendEmailDialog);
    this.$mdDialog.hide();
  }

  cancel() {
    this.userService.setPreference('showSendEmailDialog', !this.doNotShowSendEmailDialog);
    this.$mdDialog.cancel();
  }
}
angular.module('berkeleyScheduler').controller('SendEmailDialogCtrl', [
    '$state',
    '$window',
    '$mdDialog',
    '$http',
    'userService',
    'scheduleFactory',
    SendEmailDialogCtrl
]);
