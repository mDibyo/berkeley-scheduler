var BaseCtrl = require('./_base.controller');

CourseViewAndSelectCtrl.prototype = Object.create(BaseCtrl.prototype);
function CourseViewAndSelectCtrl($state, $window, $stateParams, scheduleFactory, $analytics) {
  $analytics.pageTrack('/schedule/course/{}'.replace('{}', $stateParams.id));

  BaseCtrl.call(this, $state, $window);

  var vm = this;

  vm.selectedCourse = null;
  scheduleFactory.getCourseQById($stateParams.id).then(function(course) {
    vm.selectedCourse = course;
  });
}
angular.module('berkeleyScheduler').controller('CourseViewAndSelectCtrl', [
  '$state',
  '$window',
  '$stateParams',
  'scheduleFactory',
  '$analytics',
  CourseViewAndSelectCtrl
]);
