import angular = require('angular');
import BaseCtrl = require('./_base.controller');
import IScheduleService = require('./schedule.service');
import Meeting from '../models/meeting';
import {CustomCommitmentOption} from '../models/customCommitmentOption';
import {Days, getDefaultDays} from '../utils';

interface meetingEditorDirectiveScope extends angular.IScope {
  meeting: Meeting<CustomCommitmentOption>;
  change?: any;
}

function bsMeetingEditorDirective() {
  class bsMeetingEditorCtrl extends BaseCtrl {
    days: string[] = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday'
    ];

    selectedDays: string[];

    constructor(
        $state: angular.ui.IStateService,
        $window: angular.IWindowService,
        private $scope: meetingEditorDirectiveScope,
        scheduleFactory: IScheduleService
    ) {
      super($state, $window, scheduleFactory);

      this.selectedDays = Object.keys(this.$scope.meeting.days).filter(d => this.$scope.meeting.days[d])
    }

    updateDays() {
      const newDays: Days<boolean> = getDefaultDays<boolean>(() => false);
      this.days.forEach(day => {
        newDays[day] = this.selectedDays.indexOf(day) >= 0;
      });
      this.$scope.meeting.days = newDays;
      console.log(newDays);
      this.$scope.change(this.$scope.meeting);
    }

    deleteMeeting() {
      const meeting = this.$scope.meeting;
      meeting.owner.meetings.remove(meeting);
      this.$scope.change(meeting);
    }
  }
  return {
    scope: {
      meeting: '=',
      change: '&onChange'
    },
    controller: [
        '$state',
        '$window',
        '$scope',
        'scheduleFactory',
        bsMeetingEditorCtrl
    ],
    controllerAs: 'vm',
    templateUrl: 'assets/static/html/meeting_editor.partial.html'
  }
}
angular.module('berkeleyScheduler').directive('bsMeetingEditor', [
    bsMeetingEditorDirective
]);
