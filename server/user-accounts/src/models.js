const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');


mongoose.Promise = global.Promise;

const DATABASE_URL = 'mongodb://localhost:27017/berkeley-scheduler';
mongoose.connect(DATABASE_URL);

const preferencesSchema = new mongoose.Schema({
  showMobUnoptDialog: {type: Boolean, default: true},
  showConfirmEventDeleteDialog: {type: Boolean, default: true},
  showSendEmailDialog: {type: Boolean, default: true},

  isRegistered: {type: Boolean, default: true}
});

const timeSchema = new mongoose.Schema({
  hours: {type: Number, required: true},
  minutes: {type: Number, required: true}
});

const daysSchema = new mongoose.Schema({
  'Monday': {type: Boolean, default: false},
  'Tuesday': {type: Boolean, default: false},
  'Wednesday': {type: Boolean, default: false},
  'Thursday': {type: Boolean, default: false},
  'Friday': {type: Boolean, default: false},
  'Saturday': {type: Boolean, default: false},
  'Sunday': {type: Boolean, default: false}
});

const schedulingOptionsSchema = new mongoose.Schema({
  showSavedSchedules: {type: Boolean, default: false},
  showOptions: {type: Boolean, default: false},
  minimizeGaps: {type: Boolean, default: false},
  maximizeGaps: {type: Boolean, default: false},
  minimizeNumberOfDays: {type: Boolean, default: false},
  maximizeNumberOfDays: {type: Boolean, default: false},
  preferMornings: {type: Boolean, default: false},
  preferAfternoons: {type: Boolean, default: false},
  preferEvenings: {type: Boolean, default: false},
  preferNoTimeConflicts: {type: Boolean, default: false},
  dayStartTime: timeSchema,
  dayEndTime: timeSchema,
  noTimeConflicts: {type: Boolean, default: true},
  showFinalsSchedule: {type: Boolean, default: false},
});

const courseInfoSchema = new mongoose.Schema({
  id: {type: String, required: true},
  selected: {type: Boolean, default: false},
  selectedSections: [String],
  unselectedSections: [String],
});

const meetingInfoSchema = new mongoose.Schema({
  id: {type: String, required: true},
  startTime: {type: timeSchema, required: true},
  endTime: {type: timeSchema, required: true},
  days: {type: daysSchema, required: true},
  location: {type: String, default: ''},
});

const eventSchema = new mongoose.Schema({
  id: {type: String, required: true},
  selected: {type: Boolean, required: true},
  name: {type: String, required: true},
  optionId: {type: String, required: true},
  meetings: [meetingInfoSchema],
});

const semesterSchema = new mongoose.Schema({
  semesterAbbrev: {type: String, required: true},
  courseInfos: {type: [courseInfoSchema], default: []},
  savedScheduleIds: {type: [String], default: []},
  events: {type: [eventSchema], default: []},
});


const userSchema = new mongoose.Schema({
  userId: {type: String, required: true},
  name: {
    first: String,
    last: String
  },
  email: {type: String, required: true},
  password: {type: String, required: true},
  preferences: {type: preferencesSchema, default: null},
  schedulingOptions: {type: schedulingOptionsSchema, default: null},
  semesters: {type: [semesterSchema], default: []},
}, {
  collection: 'users',
  timestamps: true
});
userSchema.plugin(uniqueValidator);

module.exports = {
  User: mongoose.model('User', userSchema)
};
