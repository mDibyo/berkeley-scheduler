'use strict';

function _ScheduleGenerationStatusBase(status) {
  this.status = status;
}

Stale.prototype = Object.create(_ScheduleGenerationStatusBase.prototype);
function Stale() {
  _ScheduleGenerationStatusBase.call(this, 'stale');
}

Generating.prototype = Object.create(_ScheduleGenerationStatusBase.prototype);
function Generating(numGenerated, total) {
  _ScheduleGenerationStatusBase.call(this, 'generating');

  this.numGenerated = numGenerated;
  this.total = total;
}

FilteringAndReordering.prototype = Object.create(_ScheduleGenerationStatusBase.prototype);
function FilteringAndReordering(total, filtering) {
  _ScheduleGenerationStatusBase.call(this, 'filteringAndReordering');

  this.total = total;
  this.filtering = filtering;
}

Done.prototype = Object.create(_ScheduleGenerationStatusBase.prototype);
function Done(total) {
  _ScheduleGenerationStatusBase.call(this, 'done');

  this.total = total;
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
