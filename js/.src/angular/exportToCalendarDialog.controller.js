var BaseCtrl = require('./_base.controller');

var ical = require('ical-generator');
var fileSaver = require('file-saver');


var MILLISECONDSPERMINUTE = 60 * 1000;

function getStartDate() {
  return new Date(2016, 7, 24);
}

var repeatingUntil = new Date(2016, 11, 3);
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
function ExportToCalendarDialogCtrl($state, $window, $mdDialog, scheduleFactory, schedule) {
  BaseCtrl.call(this, $state, $window, scheduleFactory);

  var vm = this;
  vm.schedule = schedule;
  vm.calendarFilename = 'fa16 academic calendar.ics';
  vm.download = download;
  vm.cancel = cancel;

  var calendar = ical({
    domain: 'berkeleyscheduler.com',
    prodId: {
      company: 'Berkeley Scheduler',
      product: 'berkeleyscheduler.com',
      language: 'EN'
    },
    name: 'Fall 2016 Academic Calendar',
    url: vm.getHref('schedule.viewSchedule', {
      scheduleId: schedule.id,
      noTimeConflicts: scheduleFactory.getSchedulingOptions().noTimeConflicts
    }),
    timezone: 'America/Los_Angeles',
    method: 'add'
  });

  Object.keys(vm.schedule.courses).forEach(function(courseId) {
    vm.schedule.courses[courseId].forEach(function(section) {
      var course = section.course;
      var meeting = section.meetings[0];
      var repeatingByDay = [];
      for (var day in repeatingByDayAbbrvs) {
        if (meeting.days[day]) {
          repeatingByDay.push(repeatingByDayAbbrvs[day]);
        }
      }

      if (repeatingByDay.length > 0) {
        var startDate = getStartDate();
        startDate.setHours(meeting.startTime.hours, meeting.startTime.minutes);
        var endDate = new Date(startDate.getTime() + meeting.getTotalMinutes() * MILLISECONDSPERMINUTE);
        calendar.createEvent({
          uid: 'fa16/' + course.id + '/' + section.id,
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
    })
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
  'scheduleFactory',
  'schedule',
  ExportToCalendarDialogCtrl
]);
