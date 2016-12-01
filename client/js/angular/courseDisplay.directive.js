var BaseCtrl = require('./_base.controller');

function bsCourseDisplayDirective() {
  bsCourseDisplayCtrl.prototype = Object.create(BaseCtrl.prototype);
  function bsCourseDisplayCtrl($state, $window, $scope, scheduleFactory) {
    BaseCtrl.call(this, $state, $window, scheduleFactory);

    var vm = this;

    vm.sectionTypePriority = {
      'LEC': 0,
      'SEM': 1,
      'DIS': 3,
      'GRP': 5,
      'LAB': 7
    };
    vm.selectAllSections = false;
    vm.onChangeSelectAllSections = onChangeSelectAllSections;
    vm.setStale = setSchedulesStale;
    vm.extractSectionTypeMapping = extractSectionTypeMapping;

    function onChangeSelectAllSections() {
      if (vm.selectAllSections) {
        $scope.course.instances.forEach(function(courseInstance) {
          courseInstance.sections.forEach(function(section) {
            section.selected = true;
          });
        });
      } else {
        $scope.course.instances.forEach(function(courseInstance) {
          courseInstance.sections.forEach(function(section) {
            section.selected = true;
          });
        });
      }
      setSchedulesStale();
    }

    function setSchedulesStale() {
      scheduleFactory.setStale(true);
    }

    function extractSectionTypeMapping(section) {
      return vm.sectionTypePriority[section.type];
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
