var constants = require('../constants');

var ColorRegisterableIdentifiable = require('../utils').ColorRegisterableIdentifiable;
var Meeting = require('../models/meeting').default;
var Time = require('../models/time');

var BaseCtrl = require('./_base.controller');
var CustomCommitmentOption = require('../models/customCommitmentOption').default;

function bsScheduleDisplayDirective(finals, scheduleFactory) {
  var days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  var finalDates = {};
  finals.finalDatesQByTerm.get(constants.TERM_ABBREV).then(function(fd) {
    days.forEach(function(day) {
      finalDates[day] = fd[day];
    });
  });

  var enableFinalsSchedule = true;

  var finalMeetings = [
    new Meeting(new Time(8, 0), new Time(11, 0), {}),
    new Meeting(new Time(11, 30), new Time(14, 30), {}),
    new Meeting(new Time(15, 0), new Time(18, 0), {}),
    new Meeting(new Time(19, 0), new Time(22, 0), {})
  ];

  var finalMeetingHeight = 40;
  var hourHeight = 70;
  var minuteHeight = hourHeight / 60;

  var finalColorOpacity = '0.6';
  var sectionColorOpacity = '0.6';

  sbScheduleDisplayCtrl.prototype = Object.create(BaseCtrl.prototype);
  function sbScheduleDisplayCtrl(
      $scope,
      $state,
      $window,
      $mdDialog,
      schedulingOptionsService,
      scheduleFactory,
      savedScheduleService) {
    BaseCtrl.call(this, $state, $window, schedulingOptionsService);

    var vm = this;

    vm.hours = [];
    vm.halfHours = [];
    var startHour = 24;
    var endHour = 0;
    days.forEach(function(day) {
      var meetings = $scope.schedule.meetingsByDay[day];
      meetings.forEach(function(meeting) {
        startHour = Math.min(startHour, meeting.startTime.getTotalMinutes() / 60);
        endHour = Math.max(endHour, meeting.endTime.getTotalMinutes() / 60);
      });
    });
    startHour = Math.max(8, Math.floor(startHour) - 1);
    endHour = Math.min(24, Math.ceil(endHour) + 1);

    for (var h = startHour; h < endHour; h++) {
      vm.hours.push(new Time(h, 0));
      vm.halfHours.push(new Time(h, 0));
      vm.halfHours.push(new Time(h, 30));
    }

    var startHourTotalMinutes = (new Time(startHour, 0)).getTotalMinutes();

    var schedulingOptions = schedulingOptionsService.getAllSchedulingOptions();
    vm.enableFinalsSchedule = enableFinalsSchedule;
    vm.showFinalsSchedule = schedulingOptions.showFinalsSchedule;
    vm.finalMeetings = finalMeetings;

    vm.days = days;
    vm.finalDates = finalDates;
    vm.finalColorOpacity = finalColorOpacity;
    vm.sectionColorOpacity = sectionColorOpacity;
    vm.currScheduleListInfo = scheduleFactory.getCurrScheduleListInfo();
    vm.addSavedSchedule = addSavedSchedule;
    vm.exportScheduleToCalendar = exportScheduleToCalendar;
    vm.toggleFinalsSchedule = toggleFinalsSchedule;
    vm.getFinalsForDay = getFinalsForDay;
    vm.getFinalStyle = getFinalStyle;
    vm.getFinalHoverStyle = getFinalHoverStyle;
    vm.getMeetingViewText = getMeetingViewText;
    vm.getMeetingViewTextTitle = getMeetingViewTextTitle;
    vm.getMeetingViewStyle = getMeetingViewStyle;
    vm.getMeetingViewHoverStyle = getMeetingViewHoverStyle;

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

    function addSavedSchedule(schedule) {
      return savedScheduleService.addSavedSchedule(constants.TERM_ABBREV, schedule);
    }

    function toggleFinalsSchedule() {
      vm.showFinalsSchedule = !vm.showFinalsSchedule;
      scheduleFactory.setSchedulingOption('showFinalsSchedule', vm.showFinalsSchedule);
    }

    function getFinalsForDay(courseInstanceSections, day) {
      var finals = [];
      var finalSlots = [[], [], [], []];
      for (var id in courseInstanceSections) {
        var final = courseInstanceSections[id][0].owner.finalMeeting;
        if (!final) {
          continue;
        }
        // TODO: The attempt to clone with `angular.extend` was part of a hack for displaying
        // conflicting finals in order to get a release out of the door. It was abandoned
        // because it was recursively triggering angular digests. We should not be
        // modifying the finals object as we are doing below. Refactor.
        // var clonedFinal = angular.extend({}, final);
        var clonedFinal = final;
        if (clonedFinal.finalMeeting && clonedFinal.finalMeeting.days[day]) {
          switch (final.finalMeeting.startTime.hours) {
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
      switch (final.finalMeeting.startTime.hours) {
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
      return (1 / final.slotLength) * 100 + '%';
    }

    function getFinalBackgroundColor(final) {
      return ColorRegisterableIdentifiable.colorCodes[final.courseInstance.color];
    }

    function getMeetingViewOptionType(meetingView) {
      var meetingOwner = meetingView.owner;
      return CustomCommitmentOption.isCustomCommitmentOptionId(meetingOwner.id) ? '' : meetingOwner.type;
    }

    function getMeetingViewOptionCCN(meetingView) {
      var id = meetingView.owner.id;
      return CustomCommitmentOption.isCustomCommitmentOptionId(id) ? '' : 'CCN ' + id;
    }

    function getMeetingViewText(meetingView) {
      return meetingView.owner.owner.getName() + ' ' +
          getMeetingViewOptionType(meetingView) + '<br>' +
          meetingView.location + '<br>' +
          getMeetingViewOptionCCN(meetingView);
    }

    function getMeetingViewTextTitle(meetingView) {
      return meetingView.owner.owner.getName() + ' ' +
          getMeetingViewOptionType(meetingView) + '\n' +
          meetingView.location + '\n' +
          getMeetingViewOptionCCN(meetingView);
    }

    function getMeetingViewStyle(meetingView) {
      return {
        'top': getMeetingViewTop(meetingView),
        'left': getMeetingViewLeft(meetingView),
        'height': getMeetingViewHeight(meetingView),
        'width': getMeetingViewWidth(meetingView),
        'background-color': getMeetingViewBackgroundColor(meetingView)
      };
    }

    function getMeetingViewHoverStyle(meetingView) {
      return {
        'top': getMeetingViewTop(meetingView),
        'height': getMeetingViewHeight(meetingView),
        'background-color': getMeetingViewBackgroundColor(meetingView)
      };
    }

    function getMeetingViewTop(meetingView) {
      var offset = meetingView.startTime.getTotalMinutes() - startHourTotalMinutes;
      return offset * minuteHeight;
    }

    function getMeetingViewLeft(meetingView) {
      return (meetingView.slotIdx / meetingView.group.slots.length) * 100 + '%';
    }

    function getMeetingViewHeight(meetingView) {
      var height = meetingView.totalMinutes + 1;
      return height * minuteHeight;
    }

    function getMeetingViewWidth(meetingView) {
      return (1 / meetingView.group.slots.length) * 100 + '%';
    }

    function getMeetingViewBackgroundColor(meetingView) {
      return ColorRegisterableIdentifiable.colorCodes[meetingView.owner.owner.color];
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
      'schedulingOptionsService',
      'scheduleFactory',
      'savedScheduleService',
      sbScheduleDisplayCtrl
    ],
    controllerAs: 'vm',
    templateUrl: 'assets/static/html/schedule_display.partial.html'
  }
}
angular.module('berkeleyScheduler').directive('bsScheduleDisplay', [
  'finals',
  'scheduleFactory',
  bsScheduleDisplayDirective
]);
