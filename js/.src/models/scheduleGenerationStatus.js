'use strict';

function _ScheduleGenerationStatusBase(status) {
  this.status = status;
}

Stale.prototype = Object.create(_ScheduleGenerationStatusBase.prototype);
function Stale() {
  _ScheduleGenerationStatusBase.call(this, 'stale');
}

Generating.prototype = Object.create(_ScheduleGenerationStatusBase.prototype);
function Generating(numGenerated) {
  _ScheduleGenerationStatusBase.call(this, 'generating');

  this.numGenerated = numGenerated;
}

FilteringAndReordering.prototype = Object.create(_ScheduleGenerationStatusBase.prototype);
function FilteringAndReordering(numGenerated, filtering) {
  _ScheduleGenerationStatusBase.call(this, 'filteringAndReordering');

  this.numGenerated = numGenerated;
  this.filtering = filtering;
}

Done.prototype = Object.create(_ScheduleGenerationStatusBase.prototype);
function Done(numGenerated) {
  _ScheduleGenerationStatusBase.call(this, 'done');

  this.numGenerated = numGenerated;
}

Failed.prototype = Object.create(_ScheduleGenerationStatusBase.prototype);
function Failed() {
  _ScheduleGenerationStatusBase.call(this, 'failed');
}

var scheduleGenerationStatus = {
  Stale: Stale,
  Generating: Generating,
  FilteringAndReordering: FilteringAndReordering,
  Done: Done,
  Failed: Failed
};
module.exports = scheduleGenerationStatus;
