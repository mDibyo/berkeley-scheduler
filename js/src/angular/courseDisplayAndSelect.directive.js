var BaseCtrl = require('./_base.controller');

function sbCourseDisplayAndSelectDirective() {
  sbCourseDisplayAndSelectCtrl.prototype = Object.create(BaseCtrl.prototype);
  function sbCourseDisplayAndSelectCtrl($state, $window, scheduleFactory) {
    BaseCtrl.call(this, $state, $window);

    var vm = this;

    vm.setSchedulesStale = setSchedulesStale;

    function setSchedulesStale() {
      scheduleFactory.setStale();
    }
  }

  return {
    scope: {
      course: '='
    },
    controller: [
      '$state',
      '$window',
      'scheduleFactory',
      sbCourseDisplayAndSelectCtrl
    ],
    controllerAs: 'vm',
    templateUrl: 'assets/html/course_display_and_select.partial.html'
  };
}
angular.module('scheduleBuilder').directive('sbCourseDisplayAndSelect', [
  sbCourseDisplayAndSelectDirective
]);
