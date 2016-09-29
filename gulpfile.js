(function() {
  'use strict';

  var gulp = require('gulp');
  var browserify = require('browserify');
  var jscs = require('gulp-jscs');
  var jshint = require('gulp-jshint');
  var source = require('vinyl-source-stream');
  var streamify = require('gulp-streamify');
  var svgSprite = require('gulp-svg-sprite');
  var uglify = require('gulp-uglify');

  var paths = {
    self: 'gulpfile.js',
    src: {
      js: {
        app: 'js/.src/angular/app.js',
        lib: 'js/.src/lib/index.js'
      },
      svg: 'svg/.src/*.svg'
    },
    dest: {
      js: 'js/final',
      svg: 'svg/final'
    }
  };

  gulp.task('default', ['browserify-app']);

  gulp.task('test', ['js-lint']);

  gulp.task('build', ['js', 'svg']);

  gulp.task('js', ['js-lint', 'browserify']);

  gulp.task('js-lint', ['jscs', 'jshint']);

  gulp.task('jshint', function() {
    return gulp.src([paths.self, paths.src.js.app, paths.src.js.lib])
      .pipe(jshint())
      .pipe(jshint.reporter('jshint-stylish'))
      .pipe(jshint.reporter('fail'));
  });

  gulp.task('jscs', function() {
    return gulp.src([paths.self, paths.src.js.app, paths.src.js.lib])
      .pipe(jscs())
      .pipe(jscs.reporter('jscs-stylish'))
      .pipe(jscs.reporter('fail'));
  });

  gulp.task('browserify', ['browserify-app', 'browserify-lib']);

  gulp.task('browserify-app', function() {
    return browserify([paths.src.js.app], {
      debug: true
    })
      .bundle()
      .pipe(source('app.min.js'))
      .pipe(gulp.dest(paths.dest.js));
  });

  gulp.task('browserify-lib', function() {
    return browserify([paths.src.js.lib])
      .bundle()
      .pipe(source('lib.min.js'))
      .pipe(gulp.dest(paths.dest.js));
  });

  gulp.task('release', ['js-release', 'svg']);

  gulp.task('js-release', ['js-lint', 'browserify-release']);

  gulp.task('browserify-release', [
    'browserify-release-app',
    'browserify-release-lib'
  ]);

  gulp.task('browserify-release-app', function() {
    return browserify([paths.src.js.app], {
      debug: true
    })
      .bundle()
      .pipe(source('app.min.js'))
      .pipe(streamify(uglify()))
      .pipe(gulp.dest(paths.dest.js));
  });

  gulp.task('browserify-release-lib', function() {
    return browserify([paths.src.js.lib])
      .bundle()
      .pipe(source('lib.min.js'))
      .pipe(streamify(uglify()))
      .pipe(gulp.dest(paths.dest.js));
  });

  gulp.task('svg', function() {
    return gulp.src(paths.src.svg)
      .pipe(svgSprite({
        mode: {
          defs: {
            dest: '',
            sprite: 'sprite.defs.svg'
          }
        }
      }))
      .pipe(gulp.dest(paths.dest.svg));
  });
})();
