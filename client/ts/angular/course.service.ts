import angular = require('angular');

import UserService, {CourseInfo} from './user.service';
import IReverseLookupService = require('./reverseLookup.service');

import Course from '../models/course';
import Section from '../models/section';


interface SectionsMap {[id: string]: Section}

export type Listener<T> = (item: T) => void;
export interface ListenerMap<T> {[tag: string]: Listener<T>}

class CourseService {
  private _$q: angular.IQService;
  private _reverseLookupService: IReverseLookupService;
  private _userService: UserService;

  private _ready: boolean = false;
  private _readyQ: angular.IPromise<void>;

  private _courses: Course[] = [];
  private _sections: SectionsMap = {};

  private _setReadyListeners: ListenerMap<boolean> = {};
  private _addCourseListeners: ListenerMap<Course> = {};
  private _dropCourseListeners: ListenerMap<Course> = {};

  constructor(
      $q: angular.IQService,
      reverseLookupService: IReverseLookupService,
      userService: UserService,
  ) {
    this._$q = $q;
    this._reverseLookupService = reverseLookupService;
    this._userService = userService;

    this._readyQ = this._$q.all(this._userService.courseInfos.map(
      (courseInfo: CourseInfo) => {
        return this.addCourseByIdQ(courseInfo.id).then((course: Course) => {
          course.selected = courseInfo.selected === undefined || courseInfo.selected;
          course.sections.forEach((section: Section) => {
            section.selected = courseInfo.unselectedSections.indexOf(section.id) < 0;
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

  private static _addListener<T>(listenerMap: ListenerMap<T>, tag: string, listener: Listener<T>) {
    listenerMap[tag] = listener;
  }

  addSetReadyListener(tag: string, listener: Listener<boolean>) {
    CourseService._addListener<boolean>(this._setReadyListeners, tag, listener);
  }

  addAddCourseListener(tag: string, listener: Listener<Course>) {
    CourseService._addListener<Course>(this._addCourseListeners, tag, listener);
  }

  addDropCourseListener(tag: string, listener: Listener<Course>) {
    CourseService._addListener<Course>(this._dropCourseListeners, tag, listener);
  }

  get ready(): boolean {
    return this._ready;
  }

  get sections(): SectionsMap {
    return this._sections;
  }

  getSectionQ(sectionId: string): angular.IPromise<Section> {
    if (this._sections.hasOwnProperty(sectionId)) {
      return this._$q.when(this._sections[sectionId]);
    }

    return this._reverseLookupService.getCourseQBy2arySectionId(sectionId).then(
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
    });
  }

  addCourseByIdQ(id: string): angular.IPromise<Course> {
    const courseIdx = this._courses.findIndex((c: Course) => id === c.id);
    if (courseIdx >= 0) {
      return this._$q.when(this._courses[courseIdx]);
    }

    return this._reverseLookupService.getCourseQBy2arySectionId(id).then(
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
    course.sections.forEach((section) => this._sections[section.id] = section);

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
      course.sections.forEach((section) => delete this._sections[section.id]);

      course.drop();
      this.save();

      for (const tag in this._dropCourseListeners) {
        this._dropCourseListeners[tag](course);
      }
    });
  }

  save() {
    this._userService.courseInfos = this._courses.map((course: Course) => {
      const selectedSections: string[] = [];
      const unselectedSections: string[] = [];
      course.sections.forEach((section: Section) => {
        if (section.selected) {
          selectedSections.push(section.id);
        } else {
          unselectedSections.push(section.id);
        }
      });
      return {
        id: course.id,
        selected: course.selected,
        selectedSections: selectedSections,
        unselectedSections: unselectedSections
      }
    });
  }
}

angular.module('berkeleyScheduler').service('courseService', [
  '$q',
  'reverseLookup',
  'userService',
  CourseService
]);
