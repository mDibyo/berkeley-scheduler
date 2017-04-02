var BaseCtrl = require('./_base.controller');

var constants = require('../constants');

ViewCourseCtrl.prototype = Object.create(BaseCtrl.prototype);
function ViewCourseCtrl($state, $window, $location, $stateParams, courseService, scheduleFactory, $analytics) {
  $analytics.pageTrack($location.url());

  BaseCtrl.call(this, $state, $window, scheduleFactory);

  var vm = this;

  vm.selectedCourse = null;
  courseService.addCourseByIdQ(constants.TERM_ABBREV, $stateParams.id).then(function(course) {
    vm.selectedCourse = course;
  });
}
angular.module('berkeleyScheduler').controller('ViewCourseCtrl', [
  '$state',
  '$window',
  '$location',
  '$stateParams',
  'courseService',
  'scheduleFactory',
  '$analytics',
  ViewCourseCtrl
]);
