import angular = require('angular');

import constants = require('../constants');
import IScheduleService = require('./schedule.service');
import BaseCtrl = require('./_base.controller');
import UserService from './user.service';

interface NewUserRequestData {
  email: string;
  userId: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

class SendEmailDialogCtrl extends BaseCtrl {
  doNotShowSendEmailDialog: boolean = false;

  firstName: string = '';
  lastName: string = '';
  email: string = '';
  password: string = '';

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
      userId: this.userService.primaryUserId,
      password: this.password
    };
    if (this.firstName && this.firstName.length) {
      data.firstName = this.firstName;
    }
    if (this.lastName && this.lastName.length) {
      data.lastName = this.lastName;
    }

    this.$http.post(constants.API_URL + '/user', data).then((response) => {
      this.userService.preferences.isRegistered = true;
      console.log(response);
    }, function(err) {
      console.log(err);
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
