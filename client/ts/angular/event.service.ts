import angular = require('angular');

import UserService from './user.service';
import CustomCommitment from '../models/customCommitment';
import {ListenerMap, Listener, addListener, sample} from '../utils';
import CustomCommitmentOption from '../models/customCommitmentOption';

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

interface OptionsMap {[id: string]: CustomCommitmentOption}

export default class EventService {
  private events: CustomCommitment[] = [];
  private options: OptionsMap = {};

  private createEventListeners: ListenerMap<CustomCommitment> = {};
  private deleteEventListeners: ListenerMap<CustomCommitment> = {};

  constructor(
      private userService: UserService
  ) {
    this.events = this.userService.events;
    this.events.forEach(event => {
      event.add();

      const option = event.option;
      this.options[option.id] = option;
    })
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

  setSelectedEventsById(eventIds: string[]): void {
    this.events.forEach((event) => {
      event.selected = eventIds.indexOf(event.id) >= 0;
    });
    this.save();
  }

  getOptionById(optionId: string): CustomCommitmentOption {
    return this.options[optionId];
  }

  createEvent(): CustomCommitment {
    const newEvent = new CustomCommitment(generateRandomName(), []);
    this.events.push(newEvent);
    const option = newEvent.option;
    this.options[option.id] = option;

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
    delete this.options[event.option.id];

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
