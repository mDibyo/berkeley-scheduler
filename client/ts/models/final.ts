import CourseInstance from "./courseInstance";
import Meeting from "./meeting";


class Final {
  constructor(
      public courseInstance: CourseInstance,
      public finalMeeting: Meeting<CourseInstance>) {}
}

export = Final;
