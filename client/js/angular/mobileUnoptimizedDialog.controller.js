var BaseCtrl = require('./_base.controller');
var constants = require('../constants');

MobileUnoptimizedDialogCtrl.prototype = Object.create(BaseCtrl.prototype);
function MobileUnoptimizedDialogCtrl($state, $window, $mdDialog, $http, userService, schedulingOptionsService) {
  BaseCtrl.call(this, $state, $window, schedulingOptionsService);

  var vm = this;

  vm.email = undefined;
  vm.firstName = undefined;
  vm.lastName = undefined;

  vm.doNotShowMobUnoptDialog = false;
  vm.close = close;

  function close() {
    userService.setPreference('showMobUnoptDialog', !vm.doNotShowMobUnoptDialog);

    const data = {
      email: vm.email,
      userId: userService.primaryUserId
    };
    if (vm.firstName && vm.firstName.length) {
      data.firstName = vm.firstName;
    }
    if (vm.lastName && vm.lastName.length) {
      data.lastName = vm.lastName;
    }

    $http.post(constants.API_URL + '/users', data).then(function(response) {
      console.log('email added to list');
      userService.preferences.email = vm.email;
      userService.preferences.isEmailed = true;
      console.log(response);
    }, function(err) {
      console.log(err);
    });


    $mdDialog.hide();
  }
}
angular.module('berkeleyScheduler').controller('MobileUnoptimizedDialogCtrl', [
  '$state',
  '$window',
  '$mdDialog',
  '$http',
  'userService',
  'schedulingOptionsService',
  MobileUnoptimizedDialogCtrl
]);
