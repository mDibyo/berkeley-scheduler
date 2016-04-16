(function() {
  'use strict';

  angular.module('scheduleBuilder', [
    'ui.router',
    'ngSanitize',
    'ngMaterial'
  ])
    .config([
      '$stateProvider',
      '$urlRouterProvider',
      function($stateProvider, $urlRouterProvider) {
        $stateProvider
          .state('find', {
            url: '/find',
            templateUrl: 'html/find.html',
            controller: 'CourseFindCtrl',
            controllerAs: 'vm'
          })
          .state('schedule', {
            url: '/schedule',
            templateUrl: 'html/schedule.html',
            controller: 'ScheduleCtrl',
            controllerAs: 'vm'
          });

        $urlRouterProvider.otherwise('find');
      }
    ]);

  var sampleCoursesUrl = 'assets/courses/sample_courses.json';

  function courses($http) {
    var sampleCoursesQ = $http.get(sampleCoursesUrl).then(function(response) {
      return response.data;
    });

    return {
      sampleCoursesQ: sampleCoursesQ
    }
  }
  angular.module('scheduleBuilder').factory('course', [
    '$http',
    courses
  ]);

  function BaseCtrl($state, $window) {
    var vm = this;

    vm.goToState = goToState;
    vm.goToExternal = goToExternal;

    function goToState(to, params, options) {
      $state.go(to, params, options);
    }

    function goToExternal(href) {
      $window.open(href, '_blank');
    }
  }

  CourseFindCtrl.prototype = Object.create(BaseCtrl.prototype);
  function CourseFindCtrl($state, $window, courses) {
    BaseCtrl.call(this, $state, $window);

    var vm = this;

    vm.coursesList = [];

    courses.sampleCoursesQ.then(function(courses) {
      vm.coursesList = courses;
    });
  }
  angular.module('scheduleBuilder').controller('CourseFindCtrl', [
    '$state',
    '$window',
    'courses',
    CourseFindCtrl
  ]);

  ScheduleCtrl.prototype = Object.create(BaseCtrl.prototype);
  function ScheduleCtrl($state, $window) {
    BaseCtrl.call(this, $state, $window);
  }
  angular.module('scheduleBuilder').controller('ScheduleCtrl', [
    '$state',
    '$window',
    ScheduleCtrl
  ]);
})();