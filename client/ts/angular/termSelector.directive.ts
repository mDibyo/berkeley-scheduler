import angular = require('angular');

import BaseCtrl = require("./_base.controller");
import SchedulingOptionsService from "./schedulingOptions.service";
import {Term, terms} from "../constants";
import IScheduleService = require("./schedule.service");

function bsTermSelectorDirective() {
  class bsTermSelectorCtrl extends BaseCtrl {
    terms = Object.keys(terms).map(termAbbrev => terms[termAbbrev]);
    selectedTermAbbrev: Term;

    constructor(
        $state: angular.ui.IStateService,
        $window: angular.IWindowService,
        private $stateParams: angular.ui.IStateParamsService,
        schedulingOptionsService: SchedulingOptionsService,
        private scheduleFactory: IScheduleService
    ) {
      super($state, $window, schedulingOptionsService);

      this.selectedTermAbbrev = this.$stateParams.termAbbrev;
    }

    termIsSelected = (term: Term) => {
      return term.abbrev === this.$stateParams.termAbbrev;
    };

    changeTerm() {
      if (this.selectedTermAbbrev) {
        this.goToState('schedule', {
          termAbbrev: this.selectedTermAbbrev
        }).then(() => this.scheduleFactory.setStale());
      }
    }

  }

  return {
    controller: [
        '$state',
        '$window',
        '$stateParams',
        'schedulingOptionsService',
        'scheduleFactory',
        bsTermSelectorCtrl
    ],
    controllerAs: 'tvm',
    templateUrl: 'assets/static/html/term_selector.partial.html'
  }
}
angular.module('berkeleyScheduler').directive('bsTermSelector', [
    bsTermSelectorDirective
]);
