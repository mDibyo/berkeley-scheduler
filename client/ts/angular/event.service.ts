import angular = require('angular');

import UserService from './user.service';
import {CustomCommitment} from '../models/customCommitment';

const DEFAULT_EVENT_NAME: string = 'Custom Event';

export default class EventService {
  private events: CustomCommitment[];

  constructor(
      private userService: UserService
  ) {
    this.events = this.userService.events;
  }

  getAllEvents(): CustomCommitment[] {
    return this.events;
  }

  createEvent(): CustomCommitment {
    const newEvent = new CustomCommitment(DEFAULT_EVENT_NAME, []);
    this.events.push(newEvent);
    newEvent.add();
    this.save();
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
  }

  save() {
    this.userService.events = this.events;
  }
}

angular.module('berkeleyScheduler').service('eventService', [
    'userService',
    EventService
]);
