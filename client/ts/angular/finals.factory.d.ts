import CourseInstance from "../models/courseInstance";
import Final = require("../models/final");


interface IFinalsService {
  getFinalMeetingForCourseInstanceQ(courseInstance: CourseInstance): angular.IPromise<Final>
}

export = IFinalsService;
