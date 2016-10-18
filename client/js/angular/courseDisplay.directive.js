var BaseCtrl = require('./_base.controller');

function bsCourseDisplayDirective() {
  bsCourseDisplayCtrl.prototype = Object.create(BaseCtrl.prototype);
  function bsCourseDisplayCtrl($state, $window, $scope, scheduleFactory) {
    BaseCtrl.call(this, $state, $window, scheduleFactory);

    var vm = this;

    vm.sectionTypeMapping = {
      'LEC': 0,
      'SEM': 1,
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
      bsCourseDisplayCtrl
    ],
    controllerAs: 'vm',
    templateUrl: 'assets/static/html/course_display.partial.html'
  };
}
angular.module('berkeleyScheduler').directive('bsCourseDisplay', [
  bsCourseDisplayDirective
]);
