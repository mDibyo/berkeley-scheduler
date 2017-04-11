import angular = require('angular');

import BaseCtrl = require('./_base.controller');
import Time = require('../models/time');
import SchedulingOptionsService from "./schedulingOptions.service";

interface timePickerDirectiveScope extends angular.IScope {
  applyClass?: string;
  model: Time;
  label?: string;
  timeOptions?: Time[];
  onChange?: any;
}

function bsTimePickerDirective() {
  const defaultTimeOptions: Time[] = [];
  const startHour = 0;
  const endHour = 24;
  let h = startHour;
  for (; h < endHour; h++) {
    defaultTimeOptions.push(new Time(h, 0));
    defaultTimeOptions.push(new Time(h, 30));
  }
  defaultTimeOptions.push(new Time(h, 0));

  class bsTimePickerCtrl extends BaseCtrl {
    selectedTime?: Time;
    constructor(
        $state: angular.ui.IStateService,
        $window: angular.IWindowService,
        private $timeout: angular.ITimeoutService,
        private $scope: timePickerDirectiveScope,
        schedulingOptionsService: SchedulingOptionsService
    ) {
      super($state, $window, schedulingOptionsService);

      $scope.applyClass = $scope.applyClass || '';
      $scope.timeOptions = $scope.timeOptions || defaultTimeOptions;
      this.selectedTime = $scope.model;
    }

    timeIsSelected(time: Time): boolean {
      if (!this.$scope.model) {
        return false;
      }
      return this.$scope.model.hours === time.hours
          && this.$scope.model.minutes === time.minutes;
    }

    save() {
      if (this.selectedTime) {
        const newTime = Time.parse(this.selectedTime);
        if (!this.$scope.model || this.$scope.model.compareTo(newTime) !== 0) {
          this.$scope.model = newTime;

          if (this.$scope.onChange) {
            this.$timeout(() => this.$scope.onChange({time: this.$scope.model}));
          }
        }
      }
    }
  }

  return {
    scope: {
      applyClass: '@?',
      model: '=',
      label: '=?',
      timeOptions: '=?',
      onChange: '&?'
    },
    controller: [
        '$state',
        '$window',
        '$timeout',
        '$scope',
        'schedulingOptionsService',
        bsTimePickerCtrl
    ],
    controllerAs: 'vm',
    templateUrl: 'assets/static/html/time_picker.partial.html'
  }
}
angular.module('berkeleyScheduler').directive('bsTimePicker', [
    bsTimePickerDirective
]);
