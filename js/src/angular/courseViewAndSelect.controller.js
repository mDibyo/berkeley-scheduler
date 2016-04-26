require('./_base.controller');

CourseViewAndSelectCtrl.prototype = Object.create(BaseCtrl.prototype);
function CourseViewAndSelectCtrl($state, $window, $stateParams, scheduleFactory) {
  BaseCtrl.call(this, $state, $window);

  var vm = this;

  vm.selectedCourse = null;
  scheduleFactory.getCourseQById($stateParams.id).then(function(course) {
    vm.selectedCourse = course;
    scheduleFactory.setCurrCourse(course);
  });
}
angular.module('scheduleBuilder').controller('CourseViewAndSelectCtrl', [
  '$state',
  '$window',
  '$stateParams',
  'scheduleFactory',
  CourseViewAndSelectCtrl
]);
