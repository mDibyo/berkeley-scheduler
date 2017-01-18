(function() {
  'use strict';

  angular.module('berkeleyScheduler', [
    'ui.router',
    'ngSanitize',
    'ngCookies',
    'ngMaterial',
    'angulartics',
    'angulartics.google.analytics'
  ]);

  // Configuration
  require('./config');

  // Factories
  require('./courses.factory');
  require('./finals.factory');
  require('./reverseLookup.factory');
  require('./schedule.factory');

  // Services
  require('./user.service');
  require('./course.service');
  require('./event.service');

  // Controllers
  require('./_base.controller');
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
  require('./generateSchedules.directive');
  require('./scheduleDisplay.directive');

  // Run
  require('./run');
})();
