var Course = require('../models/course');
var Meeting = require('../models/meeting');
var Time = require('../models/time');

var BaseCtrl = require('./_base.controller');

function sbScheduleDisplayDirective(scheduleFactory) {
  var hours = [];
  var halfHours = [];
  var days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  var dayDates = {
    'Monday': '12/12',
    'Tuesday': '12/13',
    'Wednesday': '12/14',
    'Thursday': '12/15',
    'Friday': '12/16'
  };

  var finalMeetings = [
    new Meeting(new Time(8, 0), new Time(11, 0), {}),
    new Meeting(new Time(11, 30), new Time(14, 30), {}),
    new Meeting(new Time(15, 0), new Time(18, 0), {}),
    new Meeting(new Time(19, 0), new Time(22, 0), {})
  ];

  var startHour = 8;
  var endHour = 24;
  var numHours = endHour - startHour;
  for (var h = startHour; h < endHour; h++) {
    hours.push(new Time(h, 0));
    halfHours.push(new Time(h, 0));
    halfHours.push(new Time(h, 30));
  }

  var finalsDayHeight = 165;

  var dayHeight = 600;
  var startHourTotalMinutes = (new Time(startHour, 0)).getTotalMinutes();
  var dayTotalMinutes = (new Time(numHours, 0)).getTotalMinutes();

  var finalColorOpacity = '0.6';
  var sectionColorOpacity = '0.6';

  sbScheduleDisplayCtrl.prototype = Object.create(BaseCtrl.prototype);
  function sbScheduleDisplayCtrl($state, $window, scheduleFactory) {
    BaseCtrl.call(this, $state, $window);

    var vm = this;

    var schedulingOptions = scheduleFactory.getSchedulingOptions();
    vm.showFinalsSchedule = schedulingOptions.showFinalsSchedule;
    vm.finalMeetings = finalMeetings;

    vm.hours = hours;
    vm.halfHours = halfHours;
    vm.days = days;
    vm.dayDates = dayDates;
    vm.finalColorOpacity = finalColorOpacity;
    vm.sectionColorOpacity = sectionColorOpacity;
    vm.currScheduleListInfo = scheduleFactory.getCurrScheduleListInfo();
    vm.showShareMessage = false;
    vm.addSavedSchedule = scheduleFactory.addSavedSchedule;
    vm.toggleFinalsSchedule = toggleFinalsSchedule;
    vm.getFinalsForDay = getFinalsForDay;
    vm.getFinalStyle = getFinalStyle;
    vm.getSectionViewStyle = getSectionViewStyle;
    vm.getSectionViewHoverStyle = getSectionViewHoverStyle;

    scheduleFactory.registerCurrScheduleListInfoChangeListener(
      'scheduleDisplay', function(info) {
        vm.currScheduleListInfo = info;
        // TODO: Figure out if this operation is required
        if (info.scheduleListChanged) {
          vm.goToState('schedule.viewSchedule', {
            scheduleId: info.firstScheduleId
          });
        }
      });

    function toggleFinalsSchedule() {
      vm.showFinalsSchedule = !vm.showFinalsSchedule;
      scheduleFactory.setSchedulingOption('showFinalsSchedule', vm.showFinalsSchedule);
    }

    function getFinalsForDay(courses, day) {
      var finals = [];
      for (var courseId in courses) {
        var final = courses[courseId][0].course.finalMeeting;
        if (final.meeting && final.meeting.days[day]) {
          finals.push(final)
        }
      }
      return finals;
    }

    function getFinalStyle(final) {
      return {
        'top': getFinalTop(final),
        'height': getFinalHeight(final),
        'background-color': getFinalBackgroundColor(final),
        'border-color': getFinalBorderColor(final)
      }
    }

    function getFinalTop(final) {
      switch (final.meeting.startTime.hours) {
        case 8:  // 8-11 AM
          return 0;
        case 11: // 11:30-2:30 PM
          return 1 / 4 * finalsDayHeight;
        case 15:  // 3-6 PM
          return 1 / 2 * finalsDayHeight;
        case 19:  // 7-10 PM
          return 3 / 4 * finalsDayHeight;
      }
    }

    function getFinalHeight() {
      return finalsDayHeight / 4;
    }

    function getFinalBackgroundColor(final) {
      var color = Course.colorCodes[final.course.color],
        r = parseInt(color.substring(1, 3), 16),
        g = parseInt(color.substring(3, 5), 16),
        b = parseInt(color.substring(5, 7), 16);
      return 'rgba('+ r + ',' + g + ',' + b + ',' + vm.finalColorOpacity + ')';
    }

    function getFinalBorderColor(final) {
      return Course.colorCodes[final.course.color];
    }

    function getSectionViewStyle(sectionView) {
      return {
        'top': getSectionViewTop(sectionView),
        'left': getSectionViewLeft(sectionView),
        'height': getSectionViewHeight(sectionView),
        'width': getSectionViewWidth(sectionView),
        'background-color': getSectionViewBackgroundColor(sectionView)
      }
    }

    function getSectionViewHoverStyle(sectionView) {
      return {
        'top': getSectionViewTop(sectionView),
        'height': getSectionViewHeight(sectionView),
        'background-color': getSectionViewBackgroundColor(sectionView)
      }
    }

    function getSectionViewTop(sectionView) {
      var offset = sectionView.startTime.getTotalMinutes() - startHourTotalMinutes;
      return offset / dayTotalMinutes * dayHeight;
    }

    function getSectionViewLeft(sectionView) {
      return (sectionView.slotIdx / sectionView.group.slots.length) * 100 + '%';
    }

    function getSectionViewHeight(sectionView) {
      var height = sectionView.totalMinutes + 1;
      return height / dayTotalMinutes * dayHeight;
    }

    function getSectionViewWidth(sectionView) {
      return (1/sectionView.group.slots.length) * 100 + '%';
    }

    function getSectionViewBackgroundColor(sectionView) {
      return Course.colorCodes[sectionView.course.color];
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
  'scheduleFactory',
  sbScheduleDisplayDirective
]);
