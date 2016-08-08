'use strict';

function SectionView(section, day) {
  this.day = day;
  this.startTime = section.meetings[0].startTime;
  this.endTime = section.meetings[0].endTime;
}

function ScheduleSectionGroup(section, day) {
  this.day = day;
  this.slots = [[new SectionView(section, day)]];
}
ScheduleSectionGroup.SectionView = SectionView;

ScheduleSectionGroup.prototype.hasOverlap = function(section) {
  var sectionView = new SectionView(section, this.day);
  for (var i = 0; i < this.slots.length; i++) {
    var slot = this.slots[i];
    if (slot[slot.length - 1].endTime.compareTo(sectionView.startTime) > 0) {
      return true;
    }
  }
  return false;
};

ScheduleSectionGroup.prototype.add = function(section) {
  var sectionView = new SectionView(section, this.day);
  for (var i = 0; i < this.slots.length; i++) {
    var slot = this.slots[i];
    if (slot[slot.length - 1].endTime.compareTo(sectionView.startTime) <= 0) {
      slot.push(sectionView);
      return;
    }
  }
  this.slots.push([sectionView]);
};

module.exports = ScheduleSectionGroup;
