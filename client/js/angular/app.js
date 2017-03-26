(function() {
  'use strict';

  angular.module('berkeleyScheduler', [
      'ui.router',
      // 'ngAnimate',
      'ngSanitize',
      'ngCookies',
      'ngMaterial',
      'angulartics',
      'angulartics.google.analytics',
      'contenteditable',
      'LocalStorageModule'
  ]);

  // Configuration
  require('./config');

  // Factories
  require('./coursesNew.factory');
  require('./finals.factory');
  require('./reverseLookup.factory');
  require('./schedule.factory');

  // Services
  require('./user.service');
  require('./course.service');
  require('./event.service');

  // Filters
  require('./reverse.filter');

  // Controllers
  require('./_base.controller');
  require('./confirmEventDeleteDialog.controller');
  require('./courseFind.controller');
  require('./exportToCalendarDialog.controller');
  require('./generatingSchedules.controller');
  require('./mobileUnoptimizedDialog.controller');
  require('./viewCourse.controller');
  require('./viewEvent.controller');
  require('./viewSchedule.controller');

  // Directives
  require('./courseDisplay.directive');
  require('./eventDisplay.directive');
  require('./meetingEditor.directive');
  require('./timePicker.directive');
  require('./generateSchedules.directive');
  require('./scheduleDisplay.directive');

  // Run
  require('./run');
})();
