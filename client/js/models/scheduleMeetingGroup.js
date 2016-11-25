'use strict';
var MeetingView = (function () {
    function MeetingView(meetingGroup, meeting, slotIdx) {
        if (slotIdx === void 0) { slotIdx = -1; }
        this.group = meetingGroup;
        this._meeting = meeting;
        this.day = this.group.day;
        this.slotIdx = slotIdx;
    }
    Object.defineProperty(MeetingView.prototype, "owner", {
        get: function () {
            return this._meeting.owner;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MeetingView.prototype, "startTime", {
        get: function () {
            return this._meeting.startTime;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MeetingView.prototype, "endTime", {
        get: function () {
            return this._meeting.endTime;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MeetingView.prototype, "location", {
        get: function () {
            return this._meeting.location;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MeetingView.prototype, "instructors", {
        get: function () {
            return this._meeting.instructors;
        },
        enumerable: true,
        configurable: true
    });
    return MeetingView;
}());
exports.MeetingView = MeetingView;
var ScheduleMeetingGroup = (function () {
    function ScheduleMeetingGroup(meeting, day) {
        this.day = day;
        this.slots = [];
        this.add(meeting);
    }
    ScheduleMeetingGroup.prototype.hasOverlap = function (meeting) {
        var meetingView = new MeetingView(this, meeting);
        for (var j = 0; j < this.slots.length; j++) {
            var slot = this.slots[j];
            if (slot[slot.length - 1].endTime.compareTo(meetingView.startTime) > 0) {
                return true;
            }
        }
        return false;
    };
    ScheduleMeetingGroup.prototype.add = function (meeting) {
        var meetingView = new MeetingView(this, meeting);
        for (var i = 0; i < this.slots.length; i++) {
            var slot = this.slots[i];
            if (slot[slot.length - 1].endTime.compareTo(meetingView.startTime) < 0) {
                slot.push(meetingView);
                meetingView.slotIdx = i;
                return;
            }
        }
        this.slots.push([meetingView]);
        meetingView.slotIdx = this.slots.length - 1;
    };
    ScheduleMeetingGroup.prototype.getMeetingViews = function () {
        return this.slots.reduce(function (a, b) {
            return a.concat(b);
        }, []);
    };
    ;
    return ScheduleMeetingGroup;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ScheduleMeetingGroup;
