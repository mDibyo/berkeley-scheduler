import angular = require('angular');

import UserService from './user.service';
import {CustomCommitment} from '../models/customCommitment';
import {ListenerMap, Listener, addListener, sample} from '../utils';

const nouns = [
    'Piano',
    'Book',
    'Class',
    'Water',
    'Gym',
    'Rain',
    'Group',
    'Big C',
    'Main Stacks',
    'Campanile',
    'Elmwood Cafe', // dedicated to Malls
    '4.0 Hill',
    'Cheeseboard',
    'BART',
    'FSM',
    'RSF'
];

const gerunds = [
    'Dancing',
    'Rolling',
    'Splashing',
    'Jaywalking',
    'Singing',
    'Exercising',
    'Jumping',
    'Watching',
    '****ing',
    'Inaugurating',
    'Sanctifying',
    'Sanitizing'
];

function generateRandomName() {
  return `${sample(nouns)} ${sample(gerunds)}`;
}

export default class EventService {
  private events: CustomCommitment[];

  private createEventListeners: ListenerMap<CustomCommitment> = {};
  private deleteEventListeners: ListenerMap<CustomCommitment> = {};

  constructor(
      private userService: UserService
  ) {
    this.events = this.userService.events;
  }

  addCreateEventListener(tag: string, listener: Listener<CustomCommitment>) {
    addListener<CustomCommitment>(this.createEventListeners, tag, listener);
  }

  addDeleteEventListener(tag: string, listener: Listener<CustomCommitment>) {
    addListener<CustomCommitment>(this.deleteEventListeners, tag, listener);
  }

  getAllEvents(): CustomCommitment[] {
    return this.events.slice();
  }

  getEventById(eventId: string): CustomCommitment|undefined {
    return this.events[this.events.findIndex(e => e.id === eventId)];
  }

  createEvent(): CustomCommitment {
    const newEvent = new CustomCommitment(generateRandomName(), []);
    this.events.push(newEvent);

    newEvent.add();
    newEvent.selected = true;
    this.save();

    for (const tag in this.createEventListeners) {
      this.createEventListeners[tag](newEvent);
    }

    return newEvent;
  }

  deleteEvent(event: CustomCommitment) {
    const eventIdx = this.events.findIndex(e => e.id === event.id);
    if (eventIdx < 0) {
      return;
    }

    this.events.splice(eventIdx, 1);
    event.drop();
    this.save();

    for (const tag in this.deleteEventListeners) {
      this.deleteEventListeners[tag](event);
    }
  }

  save() {
    this.userService.events = this.events;
  }
}

angular.module('berkeleyScheduler').service('eventService', [
    'userService',
    EventService
]);
