(function() {
  'use strict';

  var gulp = require('gulp');
  var browserify = require('browserify');
  var jscs = require('gulp-jscs');
  var jshint = require('gulp-jshint');
  var source = require('vinyl-source-stream');
  var streamify = require('gulp-streamify');
  var svgSprite = require('gulp-svg-sprite');
  var ts = require('gulp-typescript');
  var uglify = require('gulp-uglify');

  var paths = {
    self: 'gulpfile.js',
    src: {
      js: {
        root: 'client/js',
        app: 'client/js/angular/app.js',
        lib: 'client/js/lib/index.js'
      },
      svg: 'client/svg/*.svg'
    },
    dest: 'assets/gen'
  };

  gulp.task('default', ['watch']);

  gulp.task('watch', ['ts', 'js'], function() {
    console.log('watching');

    gulp.watch(paths.src.js.root + '/**/*.js', ['js']).on('change', function(event) {
      console.log(event.path);
    });
    gulp.watch(paths.src.js.root + '/**/*.ts', ['ts']).on('change', function(event) {
      console.log(event.path);
    });
  });

  gulp.task('test', ['js-lint']);

  gulp.task('build', ['js', 'svg']);

  gulp.task('js', ['js-lint', 'browserify-app']);

  gulp.task('js-lint', ['jscs', 'jshint']);

  gulp.task('jshint', function() {
    return gulp.src([paths.self, paths.src.root + '/**/*.js'])
      .pipe(jshint())
      .pipe(jshint.reporter('jshint-stylish'))
      .pipe(jshint.reporter('fail'));
  });

  gulp.task('jscs', function() {
    return gulp.src([paths.self, paths.src.js.root + '/**/*.js'])
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
      .pipe(gulp.dest(paths.dest));
  });

  gulp.task('browserify-lib', function() {
    return browserify([paths.src.js.lib])
      .bundle()
      .pipe(source('lib.min.js'))
      .pipe(gulp.dest(paths.dest));
  });

  gulp.task('release', ['js-release', 'svg']);

  gulp.task('js-release', ['ts', 'js-lint', 'browserify-release']);

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
      .pipe(gulp.dest(paths.dest));
  });

  gulp.task('browserify-release-lib', function() {
    return browserify([paths.src.js.lib])
      .bundle()
      .pipe(source('lib.min.js'))
      .pipe(streamify(uglify()))
      .pipe(gulp.dest(paths.dest));
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
      .pipe(gulp.dest(paths.dest));
  });

  gulp.task('ts', function() {
    var tsProject = ts.createProject('tsconfig.json', {
      rootDir: paths.src.js.root
    });
    var tsResult = tsProject.src().pipe(tsProject());
    return tsResult.js.pipe(gulp.dest(paths.src.js.root));
  });
})();
