var BaseCtrl = require('./_base.controller');

//var nodeCal = require('node-cal');
var ical = require('ical-generator');
var fileSaver = require('file-saver');


var MILLISECONDSPERMINUTE = 60 * 1000;

var startDates = {
  Monday: function() { return new Date(2016, 7, 29); },
  Tuesday: function() { return new Date(2016, 7, 30) },
  Wednesday: function() { return new Date(2016, 7, 24) },
  Thursday: function() { return new Date(2016, 7, 25) },
  Friday: function() { return new Date(2016, 7, 26) }
};
var recurrentUntilDate = new Date(2016, 11, 3);

ExportToCalendarDialogCtrl.prototype = Object.create(BaseCtrl.prototype);
function ExportToCalendarDialogCtrl($state, $window, $mdDialog, scheduleFactory, schedule) {
  BaseCtrl.call(this, $state, $window, scheduleFactory);

  var vm = this;
  vm.schedule = schedule;
  vm.calendarFilename = 'fa16 academic calendar.ics';
  vm.save = save;
  vm.cancel = cancel;

  console.log(schedule);

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
      for (var day in meeting.days) {
        if (meeting.days[day]) {
          var startDate = startDates[day]();
          startDate.setHours(meeting.startTime.hours, meeting.startTime.minutes);
          var endDate = new Date(startDate.getTime() + meeting.getTotalMinutes() * MILLISECONDSPERMINUTE);
          calendar.createEvent({
            uid: 'fa16/' + course.id + '/' + section.id + '/' + day + meeting.startTime.toString(),
            start: startDate,
            end: endDate,
            repeating: {
              freq: 'WEEKLY',
              until: recurrentUntilDate
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
      }
    })
  });

  function save() {
    var blob = new Blob([calendar.toString()], {type: 'text/calendar;charset=utf-8'});
    fileSaver.saveAs(blob, vm.calendarFilename);
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
