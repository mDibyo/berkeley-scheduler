(function() {
  'use strict';

  angular.module('scheduleBuilder', [
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
  require('./reverseLookup.factory');
  require('./schedule.factory');

  // Controllers
  require('./_base.controller');
  require('./courseFind.controller');
  require('./courseViewAndSelect.controller');
  require('./exportToCalendarDialog.controller');
  require('./generatingSchedules.controller');
  require('./scheduleViewAndSelect.controller');
  require('./mobileUnoptimizedDialog.controller');

  // Directives
  require('./courseDisplayAndSelect.directive');
  require('./generateSchedules.directive');
  require('./scheduleDisplay.directive');

  // Run
  require('./run');
})();
