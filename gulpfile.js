'use strict';

var gulp = require('gulp'),
	browserify = require('browserify'),
	through2 = require('through2'),
	sass = require('gulp-sass'),
	newer = require('gulp-newer'),
	filter = require('gulp-filter'),
	ngTemplates = require('gulp-ng-templates'),
	watch = require('gulp-watch'),
	batch = require('gulp-batch'),
	tap = require('gulp-tap'),
	_ = require('lodash');

var devMode = true;

gulp.task('browserify', function () {
	return gulp.src('./src/index.js')
		.pipe(through2.obj(function (file, enc, next) {
			browserify(file.path, {
				debug: devMode
			}).bundle(function (err, res) {
				if (err) {
					next(err);
				} else {
					file.contents = res;
					next(null, file);
				}
			});
		}))
		.pipe(gulp.dest('./dist'));
});

gulp.task('sass', function () {
	return gulp.src('./src/style/main.scss')
		.pipe(sass().on('error', sass.logError))
		.pipe(gulp.dest('./dist'));
});

gulp.task('index', ['button-warn'], function () {
	return gulp.src('./src/index.html')
		.pipe(gulp.dest('./dist'));
});

gulp.task('fonts', function () {
	return gulp.src([
			'./node_modules/material-design-icons-iconfont/dist/fonts/*',
			'./node_modules/roboto-fontface/fonts/*'])
		.pipe(filter(['*.eot', '*.ijmap', '*.ttf', '*.woff', '*.woff2', '*.svg']))
		.pipe(newer('./dist/fonts'))
		.pipe(gulp.dest('./dist/fonts'));
});

gulp.task('templates', ['button-warn'], function () {
	return gulp.src('./src/template/*')
		.pipe(ngTemplates({
			module: 'traq',
			standalone: false,
			filename: 'templates.js'
		}))
		.pipe(gulp.dest('./dist'));
});

gulp.task('button-warn', function () {
	// warn about any md-buttons which do not specify a type (since they are automatically submits)
	return gulp.src('./src/**/*.html')
		.pipe(tap(function (file) {
			file.contents.toString().replace(/<md-button [^>]+>/, function (match) {
				if (match.indexOf('type=') === -1) {
					console.warn('Warning: ' + _.last(file.path.split('/')) + ' untyped md-button\n ' + match);
				}
			});
		}));
});

gulp.task('default', ['browserify', 'sass', 'index', 'fonts', 'templates']);

gulp.task('watch', function () {
	watch('./src/**/*.js', batch(function (events, done) {
		gulp.start('browserify', done);
	}));
	watch('./src/**/*.scss', batch(function (events, done) {
		gulp.start('sass', done);
	}));
	watch('./src/template/**/*.html', batch(function (events, done) {
		gulp.start('templates', done);
	}));
	watch('./src/index.html', batch(function (events, done) {
		gulp.start('index', done);
	}));
});
