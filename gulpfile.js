'use strict';

var gulp = require('gulp'),
	browserify = require('browserify'),
	sass = require('gulp-sass'),
	newer = require('gulp-newer'),
	filter = require('gulp-filter'),
	ngTemplates = require('gulp-ng-templates'),
	watch = require('gulp-watch'),
	batch = require('gulp-batch'),
	tap = require('gulp-tap'),
	resolve = require('resolve'),
	source = require('vinyl-source-stream'),
	_ = require('lodash'),
	deps = _.keys(require('./package.json').dependencies),
	fs = require('fs'),
	request = require('request-promise'),
	d3 = require('d3');

var buildFull = false;

var devMode = true;

var languageUrl = 'https://docs.google.com/spreadsheets/d/1emrP3rP-p8sujNziSjfCWaTCZGu6E32VxuYbhcplILc/pub?output=csv';

gulp.task('browserify-vendor', function () {
	var b = browserify({ debug: false });

	_.each(deps, function (id) {
		try {
			var path = resolve.sync(id);
			if (path.indexOf('.js') !== path.length - 3) { throw 'not js'; }
			b.require(path, { expose: id });
		} catch (e) {}
	});

	return b.bundle()
		.pipe(source('vendor.js'))
		.pipe(gulp.dest('./dist'));
});

gulp.task('browserify-app', function () {
	var b = browserify('./src/index.js', { debug: devMode });

	_.each(deps, function (id) {
		b.external(id);
	});

	return b.bundle()
		.on('error', function (err) {
			console.log(err.toString());
		})
		.pipe(source('index.js'))
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

gulp.task('images', function () {
	return gulp.src('./src/img/**/*')
		.pipe(newer('./dist/img'))
		.pipe(gulp.dest('./dist/img'));
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



gulp.task('full-presets', ['browserify-app'], function (done) {
	try {
		var fullPresets = require('./full/presets').map(function (preset) {
			if (buildFull) {
				return preset;
			} else {
				return {
					id: preset.id,
					title: preset.title,
					category: preset.category,
					icon: preset.icon,
					locked: true
				};
			}
		});
		fs.readFile('./dist/index.js', 'utf8', function (err, js) {
			js = js.replace('// @@FULL_PRESETS', ',' + JSON.stringify(fullPresets).slice(1, -1)); // remove [ and ]
			fs.writeFile('./dist/index.js', js, done);
		});
	} catch (e) {
		console.log('No files for full version');
	}
});

gulp.task('full', ['full-presets']);

gulp.task('obfuscate', ['full'], function () {

});

gulp.task('languages', function (done) {
	request(languageUrl).then(function (csv) {
		var translations = d3.csv.parse(csv),
			languageCodes = _.chain(translations[0]).keys().filter(function (key) {
				return key.length === 2 && key !== 'id';
			}).value();
		var c = 'angular.module(\'traq\').config(function ($translateProvider) {' +
			_.map(languageCodes, function (code) {
				var language = {};
				_.each(translations, function (translation) {
					language[translation.id] = translation[code];
				});
				return '$translateProvider.translations(\'' + code + '\', ' + JSON.stringify(language) + ');';
			}).join('\n') + '});';
		fs.writeFile('./dist/languages.js', c, done);
	});
});

gulp.task('default', ['browserify-vendor', 'browserify-app', 'sass', 'index', 'fonts', 'templates', 'images', 'full']);

gulp.task('watch', function () {
	watch('./src/**/*.js', batch(function (events, done) {
		gulp.start(['browserify-app', 'full-presets'], done);
	}));
	watch('./package.json', batch(function (events, done) {
		gulp.start('browserify-vendor', done);
	}));
	watch('./src/**/*.scss', batch(function (events, done) {
		gulp.start('sass', done);
	}));
	watch('./src/template/**/*.html', batch(function (events, done) {
		gulp.start('templates', done);
	}));
	watch('./src/img/**/*', batch(function (events, done) {
		gulp.start('images', done);
	}));
	watch('./src/index.html', batch(function (events, done) {
		gulp.start('index', done);
	}));
	watch('./full/presets.js', batch(function (events, done) {
		gulp.start(['browserify-app', 'full-presets'], done);
	}));
});
