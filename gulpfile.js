'use strict';

var gulp = require('gulp'),
	browserify = require('browserify'),
	through2 = require('through2'),
	sass = require('gulp-sass'),
	newer = require('gulp-newer'),
	filter = require('gulp-filter'),
	ngTemplates = require('gulp-ng-templates'),
	watch = require('gulp-watch'),
	batch = require('gulp-batch');

var devMode = true;

gulp.task('browserify', function () {
	return gulp.src('./src/js/main.js')
		.pipe(through2.obj(function (file, enc, next) {
			browserify(file.path, {
				debug: devMode
			}).bundle(function (err, res) {
				file.contents = res;
				next(null, file);
			});
		}))
		.pipe(gulp.dest('./dist'));
});

gulp.task('sass', function () {
	return gulp.src('./src/scss/main.scss')
		.pipe(sass().on('error', sass.logError))
		.pipe(gulp.dest('./dist'));
});

gulp.task('index', function () {
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

gulp.task('templates', function () {
	return gulp.src('./src/template/*')
		.pipe(ngTemplates({
			module: 'traq',
			standalone: false,
			filename: 'templates.js'
		}))
		.pipe(gulp.dest('./dist'));
});

gulp.task('default', ['browserify', 'sass', 'index', 'fonts', 'templates']);

gulp.task('watch', function () {
	watch('./src/js/**/*.js', batch(function (events, done) {
		gulp.start('browserify', done);
	}));
	watch('./src/scss/**/*.scss', batch(function (events, done) {
		gulp.start('sass', done);
	}));
	watch('./src/template/**/*.html', batch(function (events, done) {
		gulp.start('templates', done);
	}));
	watch('./src/index.html', batch(function (events, done) {
		gulp.start('index', done);
	}));
});
