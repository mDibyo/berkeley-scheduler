import angular = require('angular');

import BaseCtrl = require('./_base.controller');
import Meeting from '../models/meeting';
import CustomCommitmentOption from '../models/customCommitmentOption';
import {Days, getDefaultDays} from '../utils';
import Time = require('../models/time');
import SchedulingOptionsService from "./schedulingOptions.service";

interface meetingEditorDirectiveScope extends angular.IScope {
  meeting: Meeting<CustomCommitmentOption>;
  change?: any;
  timeChange?: any;
}

function bsMeetingEditorDirective() {
  const timeOptions: Time[] = [];
  const startHour = 0;
  const endHour = 24;
  let h = startHour;
  for (; h < endHour; h++) {
    timeOptions.push(new Time(h, 0));
    timeOptions.push(new Time(h, 30));
  }
  timeOptions.push(new Time(h, 0));

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
    startTimeOptions: Time[] = timeOptions.slice(0, -1);
    endTimeOptions: Time[] = timeOptions.slice(1);

    constructor(
        $state: angular.ui.IStateService,
        $window: angular.IWindowService,
        private $scope: meetingEditorDirectiveScope,
        schedulingOptionsService: SchedulingOptionsService
    ) {
      super($state, $window, schedulingOptionsService);

      this.selectedDays = Object.keys(this.$scope.meeting.days).filter(d => this.$scope.meeting.days[d])
    }

    updateDays() {
      const oldDays = this.$scope.meeting.days;
      const newDays: Days<boolean> = getDefaultDays<boolean>(() => false);
      let changed: boolean = false;
      this.days.forEach(day => {
        newDays[day] = this.selectedDays.indexOf(day) >= 0;
        changed = changed || newDays[day] !== oldDays[day]
      });
      this.$scope.meeting.days = newDays;
      if (changed) {
        this.$scope.timeChange && this.$scope.timeChange(this.$scope.meeting);
        this.$scope.change && this.$scope.change(this.$scope.meeting);
      }
    }

    deleteMeeting() {
      const meeting = this.$scope.meeting;
      meeting.owner.meetings.remove(meeting);
      this.$scope.change && this.$scope.change(meeting);
    }
  }
  return {
    scope: {
      meeting: '=',
      change: '&?onChange',
      timeChange: '&?onTimeChange'
    },
    controller: [
        '$state',
        '$window',
        '$scope',
        'schedulingOptionsService',
        bsMeetingEditorCtrl
    ],
    controllerAs: 'vm',
    templateUrl: 'assets/static/html/meeting_editor.partial.html'
  }
}
angular.module('berkeleyScheduler').directive('bsMeetingEditor', [
    bsMeetingEditorDirective
]);
