import angular = require('angular');

import UserService from './user.service';
import IScheduleService from './schedule.service';

import Course from '../models/course';
import Section from '../models/section';


interface SectionsMap {[id: string]: Section}

export type Listener<T> = (item: T) => void;
export interface ListenerMap<T> {[tag: string]: Listener<T>}

class CourseService {
  private _userService: UserService;
  private _scheduleService: IScheduleService;

  private _ready: boolean = false;
  private _readyQ: angular.IPromise<void>;

  private _courses: Course[] = [];
  private _sections: SectionsMap = {};

  private _setReadyListeners: ListenerMap<boolean> = {};
  private _addCourseListeners: ListenerMap<Course> = {};
  private _dropCourseListeners: ListenerMap<Course> = {};

  constructor(userService: UserService, scheduleService: IScheduleService) {
    this._userService = userService;
    this._scheduleService = scheduleService;

    this._readyQ = this._userService.coursesQ.then((courses: Course[]) => {
      this._courses = courses;
      courses.forEach((course: Course) => {
        course.sections.forEach((s: Section) => this._sections[s.id] = s);
      });

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
  };

  addAddCourseListener(tag: string, listener: Listener<Course>) {
    CourseService._addListener<Course>(this._addCourseListeners, tag, listener);
  };

  addDropCourseListener(tag: string, listener: Listener<Course>) {
    CourseService._addListener<Course>(this._dropCourseListeners, tag, listener);
  }

  get ready(): boolean {
    return this._ready;
  }

  private _addCourseNoSave(course: Course) {
    if (this._courses.findIndex((c: Course) => course.id === c.id)) {
      return false;
    }

    this._courses.push(course);
    course.add();
    course.sections.forEach(function(section) {
      this._sections[section.id] = section;
    });

    this._scheduleService.setSchedulesStale();
    for (const tag in this._addCourseListeners) {
      this._addCourseListeners[tag](course);
    }
    return true;
  }

  addCourseQ(course: Course): angular.IPromise<boolean> {
    return this._readyQ.then(() => {
      const success: boolean = this._addCourseNoSave(course);
      if (success) {
        course.selected = true;
        this._userService.courses = this._courses;
      }
      return success;
    });
  }

  private _dropCourseNoSave(course: Course) {
    const courseIdx = this._courses.findIndex((c: Course) => course.id === c.id);
    if (courseIdx < 0) {
      return false;
    }

    this._courses.splice(courseIdx, 1);
    course.drop();
    course.sections.forEach(function(section) {
      delete this._sections[section.id];
    });
    this._scheduleService.setSchedulesStale();
    for (const tag in this._dropCourseListeners) {
      this._dropCourseListeners[tag](course);
    }
    return true;
  }

  dropCourseQ(course: Course): angular.IPromise<boolean> {
    return this._readyQ.then(() => {
      const success: boolean = this._dropCourseNoSave(course);
      if (success) {
        this._userService.courses = this._courses;
      }
      return success;
    });
  }
}

angular.module('berkeleyScheduler').service('courseService', [
  'userService',
  'scheduleFactory',
  CourseService
]);
