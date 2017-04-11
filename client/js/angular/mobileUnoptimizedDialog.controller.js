var BaseCtrl = require('./_base.controller');

MobileUnoptimizedDialogCtrl.prototype = Object.create(BaseCtrl.prototype);
function MobileUnoptimizedDialogCtrl($state, $window, $mdDialog, userService, schedulingOptionsService) {
  BaseCtrl.call(this, $state, $window, schedulingOptionsService);

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
  'schedulingOptionsService',
  MobileUnoptimizedDialogCtrl
]);
