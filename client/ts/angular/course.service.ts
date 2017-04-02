import angular = require('angular');

import * as constants from '../constants';
import UserService, {CourseInfo} from './user.service';
import reverseLookupService from './reverseLookup.service';
import Course from '../models/course';
import Section from '../models/section';
import CourseInstance from '../models/courseInstance';
import {ListenerMap, Listener, addListener} from '../utils';

interface SectionsMap {[id: string]: Section}

export default class CourseService {
  private _ready: boolean = false;
  private _readyQ: angular.IPromise<void>;

  private _courses: Course[] = [];
  private _sections: SectionsMap = {};

  private _setReadyListeners: ListenerMap<boolean> = {};
  private _addCourseListeners: ListenerMap<Course> = {};
  private _dropCourseListeners: ListenerMap<Course> = {};

  constructor(
      private $q: angular.IQService,
      private reverseLookupService: reverseLookupService,
      private userService: UserService,
  ) {
    this._readyQ = this.$q.all(this.userService.getCourseInfos(constants.TERM_ABBREV).map(
      (courseInfo: CourseInfo) => {
        return this.addCourseByIdQ(courseInfo.id).then((course: Course) => {
          course.selected = courseInfo.selected === undefined || courseInfo.selected;
          course.instances.forEach((courseInstance: CourseInstance) => {
            courseInstance.sections.forEach((section: Section) => {
              section.selected = courseInfo.unselectedSections.indexOf(section.id) < 0;
            });
          });
          return course;
        });
      }
    )).then(() => {
      this._ready = true;
      for (const tag in this._setReadyListeners) {
        this._setReadyListeners[tag](this._ready);
      }
    });
  }

  addSetReadyListener(tag: string, listener: Listener<boolean>) {
    addListener<boolean>(this._setReadyListeners, tag, listener);
  }

  addAddCourseListener(tag: string, listener: Listener<Course>) {
    addListener<Course>(this._addCourseListeners, tag, listener);
  }

  addDropCourseListener(tag: string, listener: Listener<Course>) {
    addListener<Course>(this._dropCourseListeners, tag, listener);
  }

  get ready(): boolean {
    return this._ready;
  }

  get sections(): SectionsMap {
    return this._sections;
  }

  getSectionByIdQ(sectionId: string): angular.IPromise<Section> {
    if (this._sections.hasOwnProperty(sectionId)) {
      return this.$q.when(this._sections[sectionId]);
    }

    return this.reverseLookupService.getCourseQBy2arySectionId(constants.TERM_ABBREV, sectionId).then(
      (course: Course) => {
        this.addCourse(course);
        return this._sections[sectionId];
      }
    );
  }

  getAllCoursesQ(): angular.IPromise<Course[]> {
    return this._readyQ.then(() => this._courses.slice());
  }

  setSelectedCoursesByIdQ(courseIds: string[]): angular.IPromise<void> {
    return this.getAllCoursesQ().then((allCourses) => {
      allCourses.forEach((course) => {
        course.selected = courseIds.indexOf(course.id) >= 0;
      });
      this.save();
    });
  }

  addCourseByIdQ(id: string): angular.IPromise<Course> {
    const courseIdx = this._courses.findIndex((c: Course) => id === c.id);
    if (courseIdx >= 0) {
      return this.$q.when(this._courses[courseIdx]);
    }

    return this.reverseLookupService.getCourseQBy2arySectionId(constants.TERM_ABBREV, id).then(
      (course: Course) => {
        this.addCourse(course);
        return course;
      }
    );
  }

  addCourse(course: Course): void {
    // Check if course has already been added.
    const courseIdx = this._courses.findIndex((c: Course) => course.id === c.id);
    if (courseIdx >= 0) {
      return;
    }

    // Add otherwise.
    this._courses.push(course);
    course.instances.forEach((courseInstance: CourseInstance) => {
      courseInstance.sections.forEach(section => this._sections[section.id] = section);
    });

    course.add();
    course.selected = true;
    this.save();

    for (const tag in this._addCourseListeners) {
      this._addCourseListeners[tag](course);
    }
  }

  dropCourseQ(course: Course): angular.IPromise<void> {
    return this._readyQ.then(() => {
      const courseIdx = this._courses.findIndex((c: Course) => course.id === c.id);
      if (courseIdx < 0) {
        return;
      }

      this._courses.splice(courseIdx, 1);
      course.instances.forEach((courseInstance: CourseInstance) => {
        courseInstance.sections.forEach(section => delete this._sections[section.id]);
      });

      course.drop();
      this.save();

      for (const tag in this._dropCourseListeners) {
        this._dropCourseListeners[tag](course);
      }
    });
  }

  save() {
    this.userService.setCourseInfos(constants.TERM_ABBREV, this._courses.map((course: Course) => {
      const selectedSections: string[] = [];
      const unselectedSections: string[] = [];
      course.instances.forEach((courseInstance: CourseInstance) => {
        courseInstance.sections.forEach((section: Section) => {
          if (section.selected) {
            selectedSections.push(section.id);
          } else {
            unselectedSections.push(section.id);
          }
        });
      });
      return {
        id: course.id,
        selected: course.selected,
        selectedSections: selectedSections,
        unselectedSections: unselectedSections
      }
    }));
  }
}

angular.module('berkeleyScheduler').service('courseService', [
  '$q',
  'reverseLookup',
  'userService',
  CourseService
]);
