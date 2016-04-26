(function() {
  'use strict';

  angular.module('scheduleBuilder', [
    'ui.router',
    'ngSanitize',
    'ngCookies',
    'ngMaterial'
  ]);

  // Models
  require('../models/time.js');
  require('../models/course.js');
  require('../models/schedule.js');

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
  require('./scheduleViewAndSelect.controller');

  // Directives
  require('./courseDisplayAndSelect.directive');
  require('./scheduleDisplay.directive');
  require('./generateSchedules.directive');
})();