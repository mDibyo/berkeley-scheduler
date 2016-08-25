var BaseCtrl = require('./_base.controller');

ExportToCalendarDialogCtrl.prototype = Object.create(BaseCtrl.prototype);
function ExportToCalendarDialogCtrl($state, $window, $mdDialog, schedule) {
  BaseCtrl.call(this, $state, $window);

  var vm = this;
  vm.schedule = schedule;
  vm.close = close;

  console.log(schedule);

  function close() {
    $mdDialog.hide();
  }
}
angular.module('scheduleBuilder').controller('ExportToCalendarDialogCtrl', [
  '$state',
  '$window',
  '$mdDialog',
  'schedule',
  ExportToCalendarDialogCtrl
]);
