var BaseCtrl = require('./_base.controller');

ViewCourseCtrl.prototype = Object.create(BaseCtrl.prototype);
function ViewCourseCtrl($state, $window, $stateParams, scheduleFactory, $analytics) {
  $analytics.pageTrack('/schedule/course/{}'.replace('{}', $stateParams.id));

  BaseCtrl.call(this, $state, $window, scheduleFactory);

  var vm = this;

  vm.selectedCourse = null;
  scheduleFactory.getCourseQById($stateParams.id).then(function(course) {
    vm.selectedCourse = course;
  });
}
angular.module('berkeleyScheduler').controller('ViewCourseCtrl', [
  '$state',
  '$window',
  '$stateParams',
  'scheduleFactory',
  '$analytics',
  ViewCourseCtrl
]);
