var BaseCtrl = require('./_base.controller');
var constants = require('../constants');

var ical = require('ical-generator');
var fileSaver = require('file-saver');


var MILLISECONDS_PER_MINUTE = 60 * 1000;

function getStartDate() {
  return new Date(2016, 7, 24);
}

var repeatingUntil = constants.termLastDay();
var repeatingByDayAbbrvs = {
  Sunday: 'su',
  Monday: 'mo',
  Tuesday: 'tu',
  Wednesday: 'we',
  Thursday: 'th',
  Friday: 'fr',
  Saturday: 'sa'
};

ExportToCalendarDialogCtrl.prototype = Object.create(BaseCtrl.prototype);
function ExportToCalendarDialogCtrl($state, $window, $mdDialog, schedulingOptionsService, schedule) {
  BaseCtrl.call(this, $state, $window, schedulingOptionsService);

  var vm = this;
  vm.schedule = schedule;
  vm.calendarFilename = constants.termName() + ' academic calendar.ics';
  vm.download = download;
  vm.cancel = cancel;

  var calendar = ical({
    domain: 'berkeleyscheduler.com',
    prodId: {
      company: 'Berkeley Scheduler',
      product: 'berkeleyscheduler.com',
      language: 'EN'
    },
    name: constants.termName() + ' Academic Calendar',
    url: vm.getHref('schedule.viewSchedule', {
      scheduleId: schedule.id,
      noTimeConflicts: schedulingOptionsService.getAllSchedulingOptions().noTimeConflicts
    }),
    timezone: 'America/Los_Angeles',
    method: 'add'
  });

  Object.keys(vm.schedule.courseInstances).forEach(function(courseInstanceId) {
    vm.schedule.courseInstances[courseInstanceId].forEach(function(section) {
      var course = section.owner.course;
      section.meetings.forEach(function(meeting) {
        var repeatingByDay = [];
        for (var day in repeatingByDayAbbrvs) {
          if (meeting.days[day]) {
            repeatingByDay.push(repeatingByDayAbbrvs[day]);
          }
        }

        if (repeatingByDay.length > 0) {
          var startDate = getStartDate();
          startDate.setHours(meeting.startTime.hours, meeting.startTime.minutes);
          var endDate = new Date(startDate.getTime() + meeting.getTotalMinutes() * MILLISECONDS_PER_MINUTE);
          calendar.createEvent({
            uid: constants.TERM_ABBREV + '/' + course.id + '/' + section.id,
            start: startDate,
            end: endDate,
            repeating: {
              freq: 'WEEKLY',
              until: repeatingUntil,
              byDay: repeatingByDay
            },
            summary: course.department + ' ' + course.courseNumber + ' ' + section.type + ' ' + section.number,
            description: course.description,
            location: meeting.location,
            organizer: {
              name: 'Berkeley Scheduler',
              email: 'berkeley-scheduler@berkeley.edu'
            },
            url: vm.getHref('schedule.viewCourse', {id: course.id})
          });
        }
      });
    });
  });

  function download() {
    var blob = new Blob([calendar.toString()], {type: 'text/calendar;charset=utf-8'});
    fileSaver.saveAs(blob, vm.calendarFilename);
    $mdDialog.hide();
  }

  function cancel() {
    $mdDialog.hide();
  }
}
angular.module('berkeleyScheduler').controller('ExportToCalendarDialogCtrl', [
  '$state',
  '$window',
  '$mdDialog',
  'schedulingOptionsService',
  'schedule',
  ExportToCalendarDialogCtrl
]);
