(function() {
  'use strict';

  var gulp = require('gulp');
  var browserify = require('browserify');
  var source = require('vinyl-source-stream');
  var streamify = require('gulp-streamify');
  var uglify = require('gulp-uglify');

  var paths = {
    self: 'gulpfile.js',
    src: {
      app: 'js/src/angular/app.js',
      lib: 'js/src/lib/index.js'
    },
    dest: 'js/final'
  };

  gulp.task('build', ['browserify']);

  gulp.task('browserify', ['browserify-app', 'browserify-lib']);

  gulp.task('browserify-app', function() {
    return browserify([paths.src.app], {
      debug: true
    })
      .bundle()
      .pipe(source('app.min.js'))
      .pipe(streamify(uglify()))
      .pipe(gulp.dest(paths.dest));
  });

  gulp.task('browserify-lib', function() {
    return browserify([paths.src.lib])
      .bundle()
      .pipe(source('lib.min.js'))
      .pipe(streamify(uglify()))
      .pipe(gulp.dest(paths.dest));
  });
})();