var Course = require('../models/course');
var Meeting = require('../models/meeting');
var Time = require('../models/time');

var BaseCtrl = require('./_base.controller');

function bsScheduleDisplayDirective(scheduleFactory) {
  var days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  var dayDates = {
    'Monday': '12/12',
    'Tuesday': '12/13',
    'Wednesday': '12/14',
    'Thursday': '12/15',
    'Friday': '12/16'
  };

  var enableFinalsSchedule = true;

  var finalMeetings = [
    new Meeting(new Time(8, 0), new Time(11, 0), {}),
    new Meeting(new Time(11, 30), new Time(14, 30), {}),
    new Meeting(new Time(15, 0), new Time(18, 0), {}),
    new Meeting(new Time(19, 0), new Time(22, 0), {})
  ];

  var finalMeetingHeight = 40;
  var hourHeight = 50;
  var minuteHeight = hourHeight / 60;

  var finalColorOpacity = '0.6';
  var sectionColorOpacity = '0.6';

  sbScheduleDisplayCtrl.prototype = Object.create(BaseCtrl.prototype);
  function sbScheduleDisplayCtrl($scope, $state, $window, $mdDialog, scheduleFactory) {
    BaseCtrl.call(this, $state, $window, scheduleFactory);

    var vm = this;

    var hours = [];
    var halfHours = [];
    var startHour = 24;
    var endHour = 0;
    days.forEach(function(day) {
      var sections = $scope.schedule.sectionsByDay[day];
      sections.forEach(function(section) {
        startHour = Math.min(startHour, section.meetings[0].startTime.getTotalMinutes() / 60);
        endHour = Math.max(endHour, section.meetings[0].endTime.getTotalMinutes() / 60);
      });
    });
    startHour = Math.max(8, Math.floor(startHour) - 1);
    endHour = Math.min(24, Math.ceil(endHour) + 1);

    console.log(startHour, endHour);

    if (startHour > endHour) {
      // no classes in schedule
    }

    // var startHour = 8;
    // var endHour = 24;
    for (var h = startHour; h < endHour; h++) {
      hours.push(new Time(h, 0));
      halfHours.push(new Time(h, 0));
      halfHours.push(new Time(h, 30));
    }

    var startHourTotalMinutes = (new Time(startHour, 0)).getTotalMinutes();

    var schedulingOptions = scheduleFactory.getSchedulingOptions();
    vm.enableFinalsSchedule = enableFinalsSchedule;
    vm.showFinalsSchedule = schedulingOptions.showFinalsSchedule;
    vm.finalMeetings = finalMeetings;

    vm.hours = hours;
    vm.halfHours = halfHours;
    vm.days = days;
    vm.dayDates = dayDates;
    vm.finalColorOpacity = finalColorOpacity;
    vm.sectionColorOpacity = sectionColorOpacity;
    vm.currScheduleListInfo = scheduleFactory.getCurrScheduleListInfo();
    vm.addSavedSchedule = scheduleFactory.addSavedSchedule;
    vm.exportScheduleToCalendar = exportScheduleToCalendar;
    vm.toggleFinalsSchedule = toggleFinalsSchedule;
    vm.getFinalsForDay = getFinalsForDay;
    vm.getFinalStyle = getFinalStyle;
    vm.getFinalHoverStyle = getFinalHoverStyle;
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
      var finalSlots = [[], [], [], []];
      for (var courseId in courses) {
        var final = courses[courseId][0].course.finalMeeting;
        // TODO: The attempt to clone with `angular.extend` was part of a hack for displaying
        // conflicting finals in order to get a release out of the door. It was abandoned
        // because it was recursively triggering angular digests. We should not be
        // modifying the finals object as we are doing below. Refactor.
        // var clonedFinal = angular.extend({}, final);
        var clonedFinal = final;
        if (clonedFinal.meeting && clonedFinal.meeting.days[day]) {
          switch (final.meeting.startTime.hours) {
            case 8:
              finalSlots[0].push(clonedFinal);
              break;
            case 11:
              finalSlots[1].push(clonedFinal);
              break;
            case 15:
              finalSlots[2].push(clonedFinal);
              break;
            case 19:
              finalSlots[3].push(clonedFinal);
              break;
          }
          finals.push(clonedFinal);
        }
      }

      finalSlots.forEach(function(slot) {
        var slotLength = slot.length;
        for (var slotIdx = 0; slotIdx < slotLength; slotIdx++) {
          slot[slotIdx].slotIdx = slotIdx;
          slot[slotIdx].slotLength = slotLength;
        }
      });

      return finals;
    }

    function getFinalStyle(final) {
      return {
        'top': getFinalTop(final),
        'left': getFinalLeft(final),
        'height': getFinalHeight(final),
        'width': getFinalWidth(final),
        'background-color': getFinalBackgroundColor(final)
      };
    }

    function getFinalHoverStyle(final) {
      return {
        'top': getFinalTop(final),
        'height': getFinalHeight(),
        'background-color': getFinalBackgroundColor(final)
      };
    }

    function getFinalTop(final) {
      switch (final.meeting.startTime.hours) {
        case 8: // 8-11 AM
          return 0;
        case 11: // 11:30-2:30 PM
          return finalMeetingHeight;
        case 15: // 3-6 PM
          return 2 * finalMeetingHeight;
        case 19: // 7-10 PM
          return 3 * finalMeetingHeight;
      }
    }

    function getFinalLeft(final) {
      return (final.slotIdx / final.slotLength) * 100 + '%';
    }

    function getFinalHeight() {
      return finalMeetingHeight;
    }

    function getFinalWidth(final) {
      return (1/final.slotLength) * 100 + '%';
    }

    function getFinalBackgroundColor(final) {
      return Course.colorCodes[final.course.color];
    }

    function getSectionViewStyle(sectionView) {
      return {
        'top': getSectionViewTop(sectionView),
        'left': getSectionViewLeft(sectionView),
        'height': getSectionViewHeight(sectionView),
        'width': getSectionViewWidth(sectionView),
        'background-color': getSectionViewBackgroundColor(sectionView)
      };
    }

    function getSectionViewHoverStyle(sectionView) {
      return {
        'top': getSectionViewTop(sectionView),
        'height': getSectionViewHeight(sectionView),
        'background-color': getSectionViewBackgroundColor(sectionView)
      };
    }

    function getSectionViewTop(sectionView) {
      var offset = sectionView.startTime.getTotalMinutes() - startHourTotalMinutes;
      return offset * minuteHeight;
    }

    function getSectionViewLeft(sectionView) {
      return (sectionView.slotIdx / sectionView.group.slots.length) * 100 + '%';
    }

    function getSectionViewHeight(sectionView) {
      var height = sectionView.totalMinutes + 1;
      return height * minuteHeight;
    }

    function getSectionViewWidth(sectionView) {
      return (1/sectionView.group.slots.length) * 100 + '%';
    }

    function getSectionViewBackgroundColor(sectionView) {
      return Course.colorCodes[sectionView.course.color];
    }

    function exportScheduleToCalendar(schedule) {
      $mdDialog.show({
        templateUrl: 'assets/static/html/export_to_calendar.dialog.html',
        controller: 'ExportToCalendarDialogCtrl',
        controllerAs: 'vm',
        parent: angular.element(document.body),
        clickOutsideToClose: true,
        escapeToClose: true,
        locals: {schedule: schedule}
      })
    }
  }

  return {
    scope: {
      schedule: '='
    },
    controller: [
      '$scope',
      '$state',
      '$window',
      '$mdDialog',
      'scheduleFactory',
      sbScheduleDisplayCtrl
    ],
    controllerAs: 'vm',
    templateUrl: 'assets/static/html/schedule_display.partial.html'
  }
}
angular.module('berkeleyScheduler').directive('bsScheduleDisplay', [
  'scheduleFactory',
  bsScheduleDisplayDirective
]);
