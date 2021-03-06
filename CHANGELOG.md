# Changelog

### v0.2.2
- Cleaned up Scheduling Options UI.
- Switched to SVG assets for icons.
- Added buttons to skip to schedules with different section times in
  schedule display view.
- Added handling for showing sections with time conflicts in schedule
  display view.

### v0.2.1
- Added descriptions to classes.
- Added analysis/reporting when schedule generation fails
- Removed 'Display Mode' originally meant for viewing other people's
  schedules. This is no longer required since schedule generation is
  now permitted for different combinations of classes.
- Fixed bug with displayed time for 11:30am-2:30pm Final.

### v0.2.0
- Adapted to SIS API changes.
- Added Finals schedule based on guidelines posted at
  http://schedule.berkeley.edu/examf.html.
- Worked on UI, adding icons and loader bars, and stylizing buttons.
- Made subject areas searchable by abbreviations (for eg. CS for
  COMPSCI and COG SCI).
- Added ability to save schedules.
- Added option to prefer no time conflicts.
- Made schedule generation asynchronous so user could do other things
  while it was happening.
- Allow exploring and saving schedules for different combination of
  classes.

### v0.1.2
- Fixed autocomplete by not caching course listings and adding 'Not
  found' messages.
- Added options to minimize/maximize gaps in schedule.
- Added option to remove schedules with time conflicts.
- Made some UI changes to the schedule view.
- Marked Berkeley Scheduler beta.

### v0.1.1
- Added preferMorning, preferAfternoon and preferEvening options.
- Save schedule options in cookie.
- Added 'Share' option to schedule.
- Added select for all/none of the sections for a course.
- Fixed bug with selected course highlighting in Added Courses list.


### v0.1.0
This is the first release of Berkeley Scheduler. Basic functionality
is complete. A number of bugs and features have been identified and
will be fixed/added in future releases.
