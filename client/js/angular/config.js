'use strict';

var constants = require('../constants');

angular.module('berkeleyScheduler').config([
    '$compileProvider',
    '$stateProvider',
    '$urlRouterProvider',
    '$mdThemingProvider',
    '$mdIconProvider',
    'localStorageServiceProvider',
  function($compileProvider, $stateProvider, $urlRouterProvider, $mdThemingProvider, $mdIconProvider, localStorageServiceProvider) {
    $compileProvider.debugInfoEnabled(false);

    var scheduleUrl = '/' + constants.TERM_ABBREV;

    $stateProvider
        .state('schedule', {
          url: scheduleUrl,
          templateUrl: 'assets/static/html/schedule.html',
          controller: 'CourseFindCtrl',
          controllerAs: 'vm'
        })
        .state('schedule.viewCourse', {
          url: '/course/{id}',
          templateUrl: 'assets/static/html/view_course.partial.html',
          controller: 'ViewCourseCtrl',
          controllerAs: 'vm'
        })
        .state('schedule.viewEvent', {
          url: '/custom/{id}',
          templateUrl: 'assets/static/html/view_event.partial.html',
          controller: 'ViewEventCtrl',
          controllerAs: 'vm'
        })
        .state('schedule.generatingSchedules', {
          url: '/generate?scheduleGroupId&startScheduleId',
          templateUrl: 'assets/static/html/generating_schedules.partial.html',
          controller: 'GeneratingSchedulesCtrl',
          controllerAs: 'vm'
        })
        .state('schedule.viewSchedule', {
          url: '/{scheduleId}?noTimeConflicts',
          templateUrl: 'assets/static/html/view_schedule.partial.html',
          controller: 'ViewScheduleCtrl',
          controllerAs: 'vm'
        });

    $urlRouterProvider.otherwise(scheduleUrl);

    var berkeleyPrimaryPalette = {
      '50': '#0073e1',
      '100': '#0066c8',
      '200': '#0059ae',
      '300': '#004c95',
      '400': '#003f7b',
      '500': '#003262',
      '600': '#002548',
      '700': '#00182f',
      '800': '#000b15',
      '900': '#000000',
      'A100': '#0080fb',
      'A200': '#158dff',
      'A400': '#2f99ff',
      'A700': '#000000'
    };
    $mdThemingProvider
      .definePalette('berkeley-primary', berkeleyPrimaryPalette);
    var berkeleyAccentPalette = {
      '50': '#785301',
      '100': '#916501',
      '200': '#ab7601',
      '300': '#c48802',
      '400': '#dd9902',
      '500': '#f6ab02',
      '600': '#fdbd2e',
      '700': '#fdc548',
      '800': '#fecd61',
      '900': '#fed57a',
      'A100': '#fdbd2e',
      'A200': '#FDB515',
      'A400': '#f6ab02',
      'A700': '#fedd93'
    };
    $mdThemingProvider
      .definePalette('berkeley-accent', berkeleyAccentPalette);
    $mdThemingProvider.theme('default')
      .primaryPalette('berkeley-primary')
      .accentPalette('berkeley-accent');

    $mdIconProvider
      .defaultViewBoxSize(48)
      .defaultIconSet('assets/gen/sprite.defs.svg');

    localStorageServiceProvider.setPrefix('berkeleyScheduler');
  }
]);
