var Time = require('../models/time');
var Course = require('../models/course');
var BaseCtrl = require('./_base.controller');

function sbScheduleDisplayDirective() {
  var hours = [];
  var halfHours = [];
  var days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  var startHour = 8;
  var endHour = 24;
  var numHours = endHour - startHour;
  for (var h = startHour; h < endHour; h++) {
    hours.push(new Time(h, 0));
    halfHours.push(new Time(h, 0));
    halfHours.push(new Time(h, 30));
  }

  var dayHeight = 600;
  var startHourTotalMinutes = (new Time(startHour, 0)).getTotalMinutes();
  var dayTotalMinutes = (new Time(numHours, 0)).getTotalMinutes();

  var sectionColorOpacity = '0.6';

  sbScheduleDisplayCtrl.prototype = Object.create(BaseCtrl.prototype);
  function sbScheduleDisplayCtrl($state, $window, scheduleFactory) {
    BaseCtrl.call(this, $state, $window);

    var vm = this;

    vm.hours = hours;
    vm.halfHours = halfHours;
    vm.days = days;
    vm.sectionColorOpacity = sectionColorOpacity;
    vm.currScheduleListInfo = scheduleFactory.getCurrScheduleListInfo();
    vm.showShareMessage = false;
    vm.getMeetingPosition = getMeetingPosition;
    vm.getMeetingHeight = getMeetingHeight;
    vm.getMeetingColor = getMeetingColor;

    scheduleFactory.registerCurrScheduleListInfoChangeListener(
      'scheduleDisplay', function(info) {
        vm.currScheduleListInfo = info;
        if (info.reloadRequired) {
          vm.goToState('schedule.viewSchedule', {
            scheduleId: scheduleFactory.getCurrScheduleId()
          });
        }
      });

    function getMeetingPosition(section) {
      var offset = section.meeting.startTime.getTotalMinutes() - startHourTotalMinutes;
      return offset / dayTotalMinutes * dayHeight;
    }

    function getMeetingHeight(section) {
      var height = section.meeting.getTotalMinutes();
      return height / dayTotalMinutes * dayHeight;
    }

    function getMeetingColor(section) {
      var color = Course.colorCodes[section.course.color],
        r = parseInt(color.substring(1, 3), 16),
        g = parseInt(color.substring(3, 5), 16),
        b = parseInt(color.substring(5, 7), 16);
      return 'rgba('+ r + ',' + g + ',' + b + ',' + vm.sectionColorOpacity + ')';
    }
  }

  return {
    scope: {
      schedule: '='
    },
    controller: [
      '$state',
      '$window',
      'scheduleFactory',
      sbScheduleDisplayCtrl
    ],
    controllerAs: 'vm',
    templateUrl: 'html/schedule_display.partial.html'
  }
}
angular.module('scheduleBuilder').directive('sbScheduleDisplay', [
  sbScheduleDisplayDirective
]);
