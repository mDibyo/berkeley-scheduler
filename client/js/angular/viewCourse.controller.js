var BaseCtrl = require('./_base.controller');

var constants = require('../constants');

ViewCourseCtrl.prototype = Object.create(BaseCtrl.prototype);
function ViewCourseCtrl($state, $window, $location, $stateParams, courseService, schedulingOptionsService, $analytics) {
  $analytics.pageTrack($location.url());

  BaseCtrl.call(this, $state, $window, schedulingOptionsService);

  var vm = this;

  vm.selectedCourse = null;
  courseService.addCourseByIdQ($stateParams.termAbbrev, $stateParams.id).then(function(course) {
    vm.selectedCourse = course;
  }, function() {
    vm.goToState('schedule');
  });
}
angular.module('berkeleyScheduler').controller('ViewCourseCtrl', [
  '$state',
  '$window',
  '$location',
  '$stateParams',
  'courseService',
  'schedulingOptionsService',
  '$analytics',
  ViewCourseCtrl
]);
