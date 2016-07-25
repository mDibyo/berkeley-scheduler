var BaseCtrl = require('./_base.controller');

GeneratingSchedulesCtrl.prototype = Object.create(BaseCtrl.prototype);
function GeneratingSchedulesCtrl($state, $window, $stateParams, $analytics) {
  $analytics.pageTrack('/schedule/generating/{}'.replace('{}', $stateParams.scheduleGroupId));

  BaseCtrl.call(this, $state, $window);

  var vm = this;

  vm.scheduleGroupId = $stateParams.scheduleGroupId;
}
angular.module('scheduleBuilder').controller('GeneratingSchedulesCtrl', [
  '$state',
  '$window',
  '$stateParams',
  '$analytics',
  GeneratingSchedulesCtrl
]);
