var BaseCtrl = require('./_base.controller');

function sbCourseDisplayAndSelectDirective() {
  sbCourseDisplayAndSelectCtrl.prototype = Object.create(BaseCtrl.prototype);
  function sbCourseDisplayAndSelectCtrl($state, $window, $scope, scheduleFactory) {
    BaseCtrl.call(this, $state, $window);

    var vm = this;

    vm.sectionTypeMapping = {
      'LEC': 0,
      'DIS': 3,
      'GRP': 5,
      'LAB': 7
    };
    vm.selectAllSections = false;
    vm.onChangeSelectAllSections = onChangeSelectAllSections;
    vm.setSchedulesStale = setSchedulesStale;
    vm.extractSectionTypeMapping = extractSectionTypeMapping;

    function onChangeSelectAllSections() {
      if (vm.selectAllSections) {
        $scope.course.sections.forEach(function(section) {
          section.selected = true;
        });
      } else {
        $scope.course.sections.forEach(function(section) {
          section.selected = false;
        });
      }
      setSchedulesStale();
    }

    function setSchedulesStale() {
      scheduleFactory.setStale(true);
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
      '$scope',
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
