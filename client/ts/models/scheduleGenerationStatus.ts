'use strict';

export class ScheduleGenerationStatus {
  constructor(
      public status: string
  ) {}
}

class Stale extends ScheduleGenerationStatus {
  constructor() {
    super('stale');
  }
}

class Generating extends ScheduleGenerationStatus {
  constructor(
      public numGenerated: number,
      public total: number
  ) {
    super('generating');
  }
}

class FilteringAndReordering extends ScheduleGenerationStatus {
  constructor(
      public total: number,
      public filtering: boolean
  ) {
    super('filteringAndReordering');
  }
}

class Done extends ScheduleGenerationStatus {
  constructor(
      public total: number
  ) {
    super('done');
  }
}

class Failed extends ScheduleGenerationStatus {
  constructor(
      public reason: string
  ) {
    super('failed');
  }
}

const scheduleGenerationStatus = {
  Stale: Stale,
  Generating: Generating,
  FilteringAndReordering: FilteringAndReordering,
  Done: Done,
  Failed: Failed
};

export default scheduleGenerationStatus;
