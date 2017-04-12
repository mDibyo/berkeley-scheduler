import angular = require('angular');

import UserService, {CourseInfo} from './user.service';
import reverseLookupService from './reverseLookup.service';
import Course from '../models/course';
import Section from '../models/section';
import CourseInstance from '../models/courseInstance';
import {ListenerMap, Listener, addListener, TermMap} from '../utils';
import {DEFAULT_TERM_ABBREV} from "../constants";

interface SectionsMap {[id: string]: Section}

export default class CourseService {
  constructor(
      private $q: angular.IQService,
      private reverseLookupService: reverseLookupService,
      private userService: UserService,
  ) {
    // Get Defaults
    this.readyQByTerm.get(DEFAULT_TERM_ABBREV);
  }

  private setReadyListenersByTerm: TermMap<ListenerMap<boolean>> = new TermMap(() => ({}));
  private addCourseListenersByTerm: TermMap<ListenerMap<Course>> = new TermMap(() => ({}));
  private dropCourseListenersByTerm: TermMap<ListenerMap<Course>> = new TermMap(() => ({}));

  private coursesByTerm: TermMap<Course[]> = new TermMap(() => ([]));
  private sectionsByTerm: TermMap<SectionsMap> = new TermMap(() => ({}));

  private readyByTerm: TermMap<{ready: boolean}> = new TermMap(() => ({ready: false}));
  private readyQByTerm: TermMap<angular.IPromise<void>> = new TermMap(
      termAbbrev => this.$q.all(this.userService.getCourseInfos(termAbbrev).map(
          (courseInfo: CourseInfo) => {
            return this.addCourseByIdQ(termAbbrev, courseInfo.id, false).then((course: Course) => {
              course.selected = courseInfo.selected === undefined || courseInfo.selected;
              course.instances.forEach((courseInstance: CourseInstance) => {
                courseInstance.sections.forEach((section: Section) => {
                  section.selected = courseInfo.unselectedSections.indexOf(section.id) < 0;
                });
              });
              return course;
            }, () => undefined);
          }
      )).then(() => {
        this.readyByTerm.get(termAbbrev).ready = true;
        const setReadyListeners = this.setReadyListenersByTerm.get(termAbbrev);
        for (let tag in setReadyListeners) {
          setReadyListeners[tag](true);
        }
      })
  );

  addSetReadyListener(termAbbrev: string, tag: string, listener: Listener<boolean>) {
    addListener<boolean>(this.setReadyListenersByTerm.get(termAbbrev), tag, listener);
  }

  addAddCourseListener(termAbbrev: string, tag: string, listener: Listener<Course>) {
    addListener<Course>(this.addCourseListenersByTerm.get(termAbbrev), tag, listener);
  }

  addDropCourseListener(termAbbrev: string, tag: string, listener: Listener<Course>) {
    addListener<Course>(this.dropCourseListenersByTerm.get(termAbbrev), tag, listener);
  }

  isReady(termAbbrev: string): boolean {
    return this.readyByTerm.get(termAbbrev).ready;
  }

  getSections(termAbbrev: string): SectionsMap {
    return this.sectionsByTerm.get(termAbbrev);
  }

  getSectionByIdQ(termAbbrev: string, sectionId: string): angular.IPromise<Section> {
    const sections = this.sectionsByTerm.get(termAbbrev);
    if (sections.hasOwnProperty(sectionId)) {
      return this.$q.when(sections[sectionId]);
    }

    return this.reverseLookupService.getCourseQBy2arySectionId(termAbbrev, sectionId).then(
      (course: Course) => {
        this.addCourse(termAbbrev, course);
        return sections[sectionId];
      }
    );
  }

  getAllCoursesQ(termAbbrev: string): angular.IPromise<Course[]> {
    return this.readyQByTerm.get(termAbbrev).then(
        () => this.coursesByTerm.get(termAbbrev).slice()
    );
  }

  setSelectedCoursesByIdQ(termAbbrev: string, courseIds: string[]): angular.IPromise<void> {
    return this.getAllCoursesQ(termAbbrev).then((allCourses) => {
      allCourses.forEach((course) => {
        course.selected = courseIds.indexOf(course.id) >= 0;
      });
      this.save(termAbbrev);
    });
  }

  addCourseByIdQ(termAbbrev: string, id: string, save: boolean=true): angular.IPromise<Course> {
    const courses = this.coursesByTerm.get(termAbbrev);
    const courseIdx = courses.findIndex((c: Course) => id === c.id);
    if (courseIdx >= 0) {
      return this.$q.when(courses[courseIdx]);
    }

    return this.reverseLookupService.getCourseQBy2arySectionId(termAbbrev, id).then(
        (course: Course) => {
          this.addCourse(termAbbrev, course, save);
          return course;
        }
    );
  }

  addCourse(termAbbrev: string, course: Course, save: boolean=true): void {
    // Check if course has already been added.
    const courses = this.coursesByTerm.get(termAbbrev);
    const courseIdx = courses.findIndex((c: Course) => course.id === c.id);
    if (courseIdx >= 0) {
      return;
    }

    // Add otherwise.
    courses.push(course);
    course.instances.forEach((courseInstance: CourseInstance) => {
      courseInstance.sections.forEach(
          section => this.sectionsByTerm.get(termAbbrev)[section.id] = section
      );
    });

    course.add();
    course.selected = true;
    if (save) {
      this.save(termAbbrev);
    }

    const addCourseListeners = this.addCourseListenersByTerm.get(termAbbrev);
    for (const tag in addCourseListeners) {
      addCourseListeners[tag](course);
    }
  }

  dropCourseQ(termAbbrev: string, course: Course): angular.IPromise<void> {
    return this.readyQByTerm.get(termAbbrev).then(() => {
      const courses = this.coursesByTerm.get(termAbbrev);
      const courseIdx = courses.findIndex((c: Course) => course.id === c.id);
      if (courseIdx < 0) {
        return;
      }

      courses.splice(courseIdx, 1);
      course.instances.forEach((courseInstance: CourseInstance) => {
        courseInstance.sections.forEach(
            section => delete this.sectionsByTerm.get(termAbbrev)[section.id]
        );
      });

      course.drop();
      this.save(termAbbrev);

      const dropCourseListeners = this.dropCourseListenersByTerm.get(termAbbrev);
      for (const tag in dropCourseListeners) {
        dropCourseListeners[tag](course);
      }
    });
  }

  save(termAbbrev: string) {
    this.userService.setCourseInfos(
        termAbbrev,
        this.coursesByTerm.get(termAbbrev).map((course: Course) => {
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
        })
    );
  }
}

angular.module('berkeleyScheduler').service('courseService', [
  '$q',
  'reverseLookup',
  'userService',
  CourseService
]);
