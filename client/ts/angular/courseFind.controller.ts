import angular = require('angular');
import {angulartics} from "angulartics";

import BaseCtrl = require("./_base.controller");
import UserService from "./user.service";
import reverseLookup, {CourseTitleInfo} from "./reverseLookup.service";
import courseDiscoveryService, {SubjectAreasInfo} from "./courseDiscovery.service";
import CourseService from "./course.service";
import EventService from "./event.service";
import SchedulingOptionsService from "./schedulingOptions.service";
import IScheduleService = require("./schedule.service");
import Course from "../models/course";
import CustomCommitment from "../models/customCommitment";

export default class CourseFindCtrl extends BaseCtrl {
  subjectAreaIsDisabled: boolean = false;
  courseIsDisabled: boolean = false;

  subjectAreasList: SubjectAreasInfo[] = [];
  courseTitlesList: CourseTitleInfo[] = [];

  addedCoursesList: Course[] = [];
  addedEventsList: CustomCommitment[] = [];

  courseQuery: string|null = null;
  selectedCourseTitle: CourseTitleInfo|null = null;

  private scheduleIsReady: boolean = this.courseService.isReady(this.$stateParams.termAbbrev);

  constructor(
      $state: angular.ui.IStateService,
      $window: angular.IWindowService,
      $location: angular.ILocationService,
      private $stateParams: angular.ui.IStateParamsService,
      private $mdDialog: angular.material.IDialogService,
      private userService: UserService,
      private reverseLookup: reverseLookup,
      private courseDiscoveryService: courseDiscoveryService,
      private courseService: CourseService,
      private eventService: EventService,
      schedulingOptionsService: SchedulingOptionsService,
      private scheduleFactory: IScheduleService,
      $analytics: angulartics.IAnalyticsService
  ) {
    super($state, $window, schedulingOptionsService);

    $analytics.pageTrack($location.url());

    this.courseService.getAllCoursesQ($stateParams.termAbbrev).then(
        courses => this.addedCoursesList = courses.sort(CourseFindCtrl.compareCourses)
    );
    this.addedEventsList = eventService.getAllEvents($stateParams.termAbbrev);

    this.courseDiscoveryService.getSubjectAreasQ().then(
        subjectAreas => this.subjectAreasList = subjectAreas
    );

    this.courseService.addSetReadyListener($stateParams.termAbbrev, 'courseFind', isReady => {
      this.scheduleIsReady = isReady;
      this.scheduleFactory.setStale();
    });

    this.courseService.addAddCourseListener($stateParams.termAbbrev, 'courseFind', (course: Course) => {
      let i = 0;
      for (; i < this.addedCoursesList.length; i++) {
        if (CourseFindCtrl.compareCourses(course, this.addedCoursesList[i]) > 0) {
          break;
        }
      }
      this.addedCoursesList.splice(i, 0, course);

      this.scheduleFactory.setStale();
      if (!this.scheduleIsReady) {
        return;
      }
      this.goToState('schedule.viewCourse', {id: course.id});
    });

    this.courseService.addDropCourseListener($stateParams.termAbbrev, 'courseFind', course => {
      const courseIdx = this.addedCoursesList.indexOf(course);
      this.addedCoursesList.remove(course);
      if (course.selected) {
        scheduleFactory.setStale();
      }

      if (this.addedCoursesList.length !== 0) {
        this.goToState('schedule.viewCourse', {
          id: this.addedCoursesList[Math.max(0, courseIdx - 1)].id
        });
      } else if (this.addedEventsList.length !== 0) {
        this.goToState('schedule.viewEvent', {
          id: this.addedEventsList[0].id
        });
      } else {
        this.goToState('schedule');
      }
    });

    this.eventService.addCreateEventListener($stateParams.termAbbrev, 'courseFind', event => {
      this.addedEventsList.push(event);
      scheduleFactory.setStale();
      this.goToState('schedule.viewEvent', {id: event.id});
    });

    this.eventService.addDeleteEventListener($stateParams.termAbbrev, 'courseFind', event => {
      this.addedEventsList.remove(event);
      if (event.selected) {
        scheduleFactory.setStale();
      }

      if (this.addedEventsList.length !== 0) {
        this.goToState('schedule.viewEvent', {
          id: this.addedEventsList[this.addedEventsList.length - 1].id
        });
      } else if (this.addedCoursesList.length !== 0) {
        this.goToState('schedule.viewCourse', {
          id: this.addedCoursesList[this.addedCoursesList.length - 1].id
        });
      } else {
        this.goToState('schedule');
      }
    });
  }

  setStale = this.scheduleFactory.setStale;

  searchSubjectArea(query: string) {
    return query ?
        this.subjectAreasList.filter(CourseFindCtrl.createSubjectAreaFilterFor(query)) :
        this.subjectAreasList;
  }

  private static createSubjectAreaFilterFor(query: string) {
    query = angular.lowercase(query);
    return function filterFn(subjectArea: SubjectAreasInfo) {
      if (angular.lowercase(subjectArea.code).indexOf(query) === 0) {
        return true;
      }
      if (angular.lowercase(subjectArea.description).indexOf(query) === 0) {
        return true;
      }
      return subjectArea.abbreviations.some(
          abbrev => angular.lowercase(abbrev).indexOf(query) === 0
      );
    };
  }

  selectSubjectArea(subjectArea: SubjectAreasInfo) {
    this.courseQuery = null;
    this.selectedCourseTitle = null;

    if (!subjectArea) {
      this.courseIsDisabled = true;
      this.courseTitlesList = [];
      return;
    }

    this.reverseLookup
        .getCourseTitlesQBySubjectAreaCode(this.$stateParams.termAbbrev, subjectArea.code)
        .then(courseTitles => {

          this.courseTitlesList = courseTitles.sort(
              (ct1, ct2) => CourseFindCtrl.compareCourseNumbers(ct1.courseNumber, ct2.courseNumber)
          );
          this.courseIsDisabled = false;
        });
  }

  searchCourseTitle(query: string): CourseTitleInfo[] {
    return query ? this.courseTitlesList.filter(CourseFindCtrl.createCourseFilterFor(query)) : this.courseTitlesList;
  }

  private static createCourseFilterFor(query: string) {
    query = angular.lowercase(query);
    return function filterFn(courseTitle: CourseTitleInfo): boolean {
      return (
          angular.lowercase(courseTitle.courseNumber).indexOf(query) === 0 ||
          angular.lowercase(courseTitle.title).indexOf(query) === 0
      );
    };
  }

  selectCourseWithTitle() {
    const courseQuery = this.courseQuery;
    const courseTitle = this.selectedCourseTitle;

    this.courseQuery = null;
    this.selectedCourseTitle = null;

    if (!courseQuery || !courseQuery.length || !courseTitle) {
      return;
    }

    this.reverseLookup
        .getCourseQBy1arySectionId(this.$stateParams.termAbbrev, courseTitle.id)
        .then(course => this.addCourse(course));
  }

  private static courseNumberRegex = /^([a-zA-Z]*)(\d+)([a-zA-Z]*)/;
  private static defaultCourseNumberRegexMatch = ["0", "", "0", ""];
  private static compareCourseNumbers(courseNumber1: string, courseNumber2: string): number {
    const [ , prefix1, number1, suffix1] =
    CourseFindCtrl.courseNumberRegex.exec(courseNumber1) || CourseFindCtrl.defaultCourseNumberRegexMatch;
    const [ , prefix2, number2, suffix2] =
    CourseFindCtrl.courseNumberRegex.exec(courseNumber2) || CourseFindCtrl.defaultCourseNumberRegexMatch;

    if (number1 !== number2) {
      return parseInt(number1) - parseInt(number2);
    }

    if (suffix1 !== suffix2) {
      return suffix1.localeCompare(suffix2, undefined, {sensitivity: 'base'});
    }

    return prefix1.localeCompare(prefix2, undefined, {sensitivity: 'base'});
  }

  static compareCourses(course1: Course, course2: Course): number {
    const compareDepartments = course1.department.localeCompare(
        course2.department,
        undefined,
        {sensitivity: 'base'}
    );

    return compareDepartments
        ? compareDepartments
        : CourseFindCtrl.compareCourseNumbers(course1.courseNumber, course2.courseNumber);
  }

  addCourse(course: Course) {
    this.courseService.addCourse(this.$stateParams.termAbbrev, course);
  }

  dropCourse(course: Course) {
    this.courseService.dropCourseQ(this.$stateParams.termAbbrev, course);
  }

  createEvent() {
    this.eventService.createEvent(this.$stateParams.termAbbrev);
  }

  deleteEvent(event: CustomCommitment) {
    if (this.userService.preferences.showConfirmEventDeleteDialog) {
      this.$mdDialog.show({
        templateUrl: 'assets/static/html/confirm_event_delete.dialog.html',
        controller: 'ConfirmEventDeleteDialogCtrl',
        controllerAs: 'vm',
        parent: (<(element: HTMLElement) => JQuery> angular.element)(document.body),
        clickOutsideToClose: true,
        escapeToClose: true,
        locals: {
          eventName: event.getName(),
          onConfirm: () => this.eventService.deleteEvent(this.$stateParams.termAbbrev, event)
        }
      });
    } else {
      this.eventService.deleteEvent(this.$stateParams.termAbbrev, event);
    }
  }
}
angular.module('berkeleyScheduler').controller('CourseFindCtrl', [
    '$state',
    '$window',
    '$location',
    '$stateParams',
    '$mdDialog',
    'userService',
    'reverseLookup',
    'courseDiscoveryService',
    'courseService',
    'eventService',
    'schedulingOptionsService',
    'scheduleFactory',
    '$analytics',
    CourseFindCtrl
]);
