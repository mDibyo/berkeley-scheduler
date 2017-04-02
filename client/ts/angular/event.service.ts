import angular = require('angular');

import UserService from './user.service';
import CustomCommitment from '../models/customCommitment';
import {ListenerMap, Listener, addListener, sample, TermMap} from '../utils';
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
  constructor(
      private userService: UserService
  ) {}

  private eventsByTerm: TermMap<CustomCommitment[]> = new TermMap(termAbbrev => {
    const events = this.userService.getEvents(termAbbrev);
    const options = this.optionsByTerm.get(termAbbrev);
    events.forEach(event => {
      event.add();

      const option = event.option;
      options[option.id] = option;
    });
    return events;
  });
  private optionsByTerm: TermMap<OptionsMap> = new TermMap(() => ({}));

  private createEventListenersByTerm: TermMap<ListenerMap<CustomCommitment>> = new TermMap(() => ({}));
  private deleteEventListenersByTerm: TermMap<ListenerMap<CustomCommitment>> = new TermMap(() => ({}));

  addCreateEventListener(termAbbrev: string, tag: string, listener: Listener<CustomCommitment>) {
    addListener<CustomCommitment>(this.createEventListenersByTerm.get(termAbbrev), tag, listener);
  }

  addDeleteEventListener(termAbbrev: string, tag: string, listener: Listener<CustomCommitment>) {
    addListener<CustomCommitment>(this.deleteEventListenersByTerm.get(termAbbrev), tag, listener);
  }

  getAllEvents(termAbbrev: string): CustomCommitment[] {
    return this.eventsByTerm.get(termAbbrev).slice();
  }

  getEventById(termAbbrev: string, eventId: string): CustomCommitment|undefined {
    const events = this.eventsByTerm.get(termAbbrev);
    return events[events.findIndex(e => e.id === eventId)];
  }

  setSelectedEventsById(termAbbrev: string, eventIds: string[]): void {
    this.eventsByTerm.get(termAbbrev).forEach((event) => {
      event.selected = eventIds.indexOf(event.id) >= 0;
    });
    this.save(termAbbrev);
  }

  getOptionById(termAbbrev: string, optionId: string): CustomCommitmentOption {
    return this.optionsByTerm.get(termAbbrev)[optionId];
  }

  createEvent(termAbbrev: string): CustomCommitment {
    const newEvent = new CustomCommitment(generateRandomName(), []);
    this.eventsByTerm.get(termAbbrev).push(newEvent);
    const option = newEvent.option;
    this.optionsByTerm.get(termAbbrev)[option.id] = option;

    newEvent.add();
    newEvent.addMeeting();

    newEvent.selected = true;
    this.save(termAbbrev);

    const createEventListeners = this.createEventListenersByTerm.get(termAbbrev);
    for (const tag in createEventListeners) {
      createEventListeners[tag](newEvent);
    }

    return newEvent;
  }

  deleteEvent(termAbbrev: string, event: CustomCommitment) {
    const events = this.eventsByTerm.get(termAbbrev);
    const eventIdx = events.findIndex(e => e.id === event.id);
    if (eventIdx < 0) {
      return;
    }

    events.splice(eventIdx, 1);
    delete this.optionsByTerm.get(termAbbrev)[event.option.id];

    event.drop();
    this.save(termAbbrev);

    const deleteEventListeners = this.deleteEventListenersByTerm.get(termAbbrev);
    for (const tag in deleteEventListeners) {
      deleteEventListeners[tag](event);
    }
  }

  save(termAbbrev: string) {
    this.userService.setEvents(termAbbrev, this.eventsByTerm.get(termAbbrev));
  }
}

angular.module('berkeleyScheduler').service('eventService', [
    'userService',
    EventService
]);
