var BaseCtrl = require('./_base.controller');

MobileUnoptimizedDialogCtrl.prototype = Object.create(BaseCtrl.prototype);
function MobileUnoptimizedDialogCtrl($state, $window, $mdDialog, userService, scheduleFactory) {
  BaseCtrl.call(this, $state, $window, scheduleFactory);

  var vm = this;

  vm.doNotShowMobUnoptDialog = false;
  vm.close = close;

  function close() {
    userService.setPreference('showMobUnoptDialog', !vm.doNotShowMobUnoptDialog);
    $mdDialog.hide();
  }
}
angular.module('berkeleyScheduler').controller('MobileUnoptimizedDialogCtrl', [
  '$state',
  '$window',
  '$mdDialog',
  'userService',
  'scheduleFactory',
  MobileUnoptimizedDialogCtrl
]);
