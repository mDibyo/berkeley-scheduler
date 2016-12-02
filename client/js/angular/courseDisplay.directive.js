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
    vm.onChangeSelectPrimarySection = onChangeSelectPrimarySection;
    vm.setStale = setSchedulesStale;
    vm.extractSectionTypePriority = extractSectionTypePriority;

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
            section.selected = false;
          });
        });
      }
      setSchedulesStale();
    }

    function onChangeSelectPrimarySection(courseInstance) {
      if (courseInstance.primarySection.selected) {
        courseInstance.secondarySections.forEach(function(section) {
          section.selected = true;
        });
      } else {
        courseInstance.secondarySections.forEach(function(section) {
          section.selected = false;
        });
      }
      setSchedulesStale();
    }

    function setSchedulesStale() {
      scheduleFactory.setStale(true);
    }

    function extractSectionTypePriority(section) {
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
