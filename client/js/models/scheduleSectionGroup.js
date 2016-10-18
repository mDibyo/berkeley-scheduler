'use strict';

function SectionView(sectionGroup, section, day, slotIdx) {
  this.group = sectionGroup;
  this.course = section.course;
  this.type = section.type;
  this.id = section.id;
  this.startTime = section.meetings[0].startTime;
  this.endTime = section.meetings[0].endTime;
  this.location = section.meetings[0].location;
  this.totalMinutes = section.meetings[0].getTotalMinutes();
  this.day = day;
  this.slotIdx = slotIdx !== undefined ? slotIdx : -1;
}

function ScheduleSectionGroup(section, day) {
  this.day = day;
  this.slots = [[new SectionView(this, section, day, 0)]];
}
ScheduleSectionGroup.SectionView = SectionView;

ScheduleSectionGroup.prototype.hasOverlap = function(section) {
  var sectionView = new SectionView(this, section, this.day);
  for (var i = 0; i < this.slots.length; i++) {
    var slot = this.slots[i];
    if (slot[slot.length - 1].endTime.compareTo(sectionView.startTime) > 0) {
      return true;
    }
  }
  return false;
};

ScheduleSectionGroup.prototype.add = function(section) {
  var sectionView = new SectionView(this, section, this.day);
  for (var i = 0; i < this.slots.length; i++) {
    var slot = this.slots[i];
    if (slot[slot.length - 1].endTime.compareTo(sectionView.startTime) <= 0) {
      slot.push(sectionView);
      sectionView.slotIdx = i;
      return;
    }
  }
  this.slots.push([sectionView]);
  sectionView.slotIdx = this.slots.length - 1;
};

ScheduleSectionGroup.prototype.getSectionViews = function() {
  return this.slots.reduce(function(a, b) {
    return a.concat(b);
  }, []);
};

module.exports = ScheduleSectionGroup;
