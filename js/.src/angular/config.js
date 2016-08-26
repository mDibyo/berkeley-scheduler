angular.module('berkeleyScheduler').config([
  '$compileProvider',
  '$stateProvider',
  '$urlRouterProvider',
  '$mdThemingProvider',
  '$mdIconProvider',
  function($compileProvider, $stateProvider, $urlRouterProvider, $mdThemingProvider, $mdIconProvider) {
    $compileProvider.debugInfoEnabled(false);

    $stateProvider
      .state('schedule', {
        url: '/schedule',
        templateUrl: 'html/schedule.html',
        controller: 'CourseFindCtrl',
        controllerAs: 'vm'
      })
      .state('schedule.viewCourse', {
        url: '/course/{id}',
        templateUrl: 'html/course_view_and_select.partial.html',
        controller: 'CourseViewAndSelectCtrl',
        controllerAs: 'vm'
      })
      .state('schedule.generatingSchedules', {
        url: '/generate?scheduleGroupId&startScheduleId',
        templateUrl: 'html/generating_schedules.partial.html',
        controller: 'GeneratingSchedulesCtrl',
        controllerAs: 'vm'
      })
      .state('schedule.viewSchedule', {
        url: '/{scheduleId}',
        templateUrl: 'html/schedule_view_and_select.partial.html',
        controller: 'ScheduleViewAndSelectCtrl',
        controllerAs: 'vm'
      });

    $urlRouterProvider.otherwise('schedule');

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
      .definePalette('berkeley-primary',
        berkeleyPrimaryPalette);
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
      .definePalette('berkeley-accent',
        berkeleyAccentPalette);
    $mdThemingProvider.theme('default')
      .primaryPalette('berkeley-primary')
      .accentPalette('berkeley-accent');

    $mdIconProvider
      .defaultViewBoxSize(48)
      .defaultIconSet('svg/final/sprite.defs.svg');
  }
]);
