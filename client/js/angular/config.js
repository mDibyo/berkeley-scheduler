'use strict';

var constants = require('../constants');

angular.module('berkeleyScheduler').config([
  '$compileProvider',
  '$httpProvider',
  '$stateProvider',
  '$urlRouterProvider',
  '$mdThemingProvider',
  '$mdIconProvider',
  '$mdDialogProvider',
  'localStorageServiceProvider',
  function(
      $compileProvider,
      $httpProvider,
      $stateProvider,
      $urlRouterProvider,
      $mdThemingProvider,
      $mdIconProvider,
      $mdDialogProvider,
      localStorageServiceProvider
  ) {
    $compileProvider.debugInfoEnabled(false);

    $httpProvider.defaults.useXDomain = true;

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

    // Palettes defined using
    // UC Berkeley brand colors: http://www.berkeley.edu/brand/img/colors/WebColor_accessible_AA_swatches.pdf
    // Angular Material Color generator: https://angular-md-color.com/#/
    $mdThemingProvider
        .definePalette('berkeley-primary', {
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
        })
        .definePalette('berkeley-accent', {
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
        })
        .definePalette('berkeley-warn', {
          '50': '#f7b4a8',
          '100': '#f59f91',
          '200': '#f38b79',
          '300': '#f17762',
          '400': '#ef624a',
          '500': '#ED4E33',
          '600': '#eb3a1c',
          '700': '#da3013',
          '800': '#c22b11',
          '900': '#ab260f',
          'A100': '#f9c8c0',
          'A200': '#fbdcd7',
          'A400': '#fef1ee',
          'A700': '#93210d'
        });
    $mdThemingProvider.theme('default')
        .primaryPalette('berkeley-primary')
        .accentPalette('berkeley-accent')
        .warnPalette('berkeley-warn');

    $mdIconProvider
      .defaultViewBoxSize(48)
      .defaultIconSet('assets/gen/sprite.defs.svg');

    var dialogDefaults = {
      controllerAs: 'vm',
      parent: angular.element(document.body),
      bindToController: true,
      clickOutsideToClose: true,
      escapeToClose: true
    };
    $mdDialogProvider
        .addPreset('mobileUnoptimizedPreset', {
          options: function() {
            return angular.extend({}, dialogDefaults, {
              templateUrl: 'assets/static/html/mobile_unoptimized.dialog.html',
              controller: 'MobileUnoptimizedDialogCtrl'
            });
          }
        })
        .addPreset('sendEmailPreset', {
          options: function() {
            return angular.extend({}, dialogDefaults, {
              templateUrl: 'assets/static/html/send_email.dialog.html',
              controller: 'SendEmailDialogCtrl'
            });
          }
        });

    localStorageServiceProvider.setPrefix('berkeleyScheduler');
  }
]);
