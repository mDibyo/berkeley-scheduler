var BaseCtrl = require('./_base.controller');

function sbCourseDisplayAndSelectDirective() {
  sbCourseDisplayAndSelectCtrl.prototype = Object.create(BaseCtrl.prototype);
  function sbCourseDisplayAndSelectCtrl($state, $window, scheduleFactory) {
    BaseCtrl.call(this, $state, $window);

    var vm = this;

    vm.sectionTypeMapping = {
      'LEC': 0,
      'DIS': 3,
      'GRP': 5,
      'LAB': 7
    };
    vm.setSchedulesStale = setSchedulesStale;
    vm.extractSectionTypeMapping = extractSectionTypeMapping;

    function setSchedulesStale() {
      scheduleFactory.setStale();
    }

    function extractSectionTypeMapping(section) {
      return vm.sectionTypeMapping[section.type];
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
    templateUrl: 'html/course_display_and_select.partial.html'
  };
}
angular.module('scheduleBuilder').directive('sbCourseDisplayAndSelect', [
  sbCourseDisplayAndSelectDirective
]);
