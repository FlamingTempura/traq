'use strict';

var angular = require('angular'),
	_ = require('lodash'),
	moment = require('moment');

var expensesData = function () {
	var expenses = [];
	_.times(700, function (i) {
		if (Math.random() > 0.3) { return; }
		expenses.push({
			timestamp: moment()
				.subtract(i, 'days')
				.hour(Math.round(Math.random() * 24))
				.minute(Math.round(Math.random() * 60))
				.second(Math.round(Math.random() * 60))
				.toDate(),
			value: Math.round(Math.random() * 10000) / 100
		});
	});
	return expenses;
};

angular.module('traq')
	.constant('presetColumns', [
		{
			name: 'Weight',
			color: '#87D37C',
			icon: 'filter-frames',
			units: [
				{ title: 'kg', value: 'kg', default: true },
				{ title: 'lbs', value: 'lbs' },
				{ title: 'st', value: 'st' }],
			forecast: { before: true, after: true }
		},
		{
			name: 'Heart rate',
			color: '#F22613',
			icon: 'favorite',
			units: [{ title: 'bpm', value: 'bpm', default: true }]
		},
		{
			name: 'Hours slept',
			color: '#81CFE0',
			icon: 'airline-seat-individual-suite',
			units: [{ title: 'hours', value: 'hours', default: true }]
		},
		{
			name: 'Height',
			color: '#F4D03F',
			icon: 'straighten',
			units: [
				{ title: 'm', value: 'm', default: true },
				{ title: 'ft', value: 'ft' }],
			forecast: { before: true, after: true }
		},
		{
			name: 'Walking (steps)',
			color: '#03C9A9',
			icon: 'directions-walk',
			units: [{ title: 'steps', value: 'steps', default: true }]
		},
		{
			name: 'Walking (distance)',
			color: '#F22613',
			icon: 'directions-walk',
			units: [{ title: 'km', value: 'km', default: true }]
		},
		{
			name: 'Walking (calories)',
			color: '#F89406',
			icon: 'directions-walk',
			units: [{ title: 'kcal', value: 'kcal', default: true }]
		},
		{
			name: 'Walking (duration)',
			color: '#87D37C',
			icon: 'directions-walk',
			units: [{ title: 'minutes', value: 'mins', default: true }]
		},
		{
			name: 'Running (distance)',
			color: '#ED009A',
			icon: 'directions-run',
			units: [{ title: 'km', value: 'km', default: true }]
		},
		{
			name: 'Running (calories)',
			color: '#F9690E',
			icon: 'directions-run',
			units: [{ title: 'kcal', value: 'kcal', default: true }]
		},
		{
			name: 'Running (steps)',
			color: '#F4D03F',
			icon: 'directions-run',
			units: [{ title: 'steps', value: 'steps', default: true }]
		},
		{
			name: 'Running (duration)',
			color: '#03C9A9',
			icon: 'directions-run',
			units: [{ title: 'minutes', value: 'mins', default: true }]
		},
		{
			name: 'Cycling (distance)',
			color: '#19B5FE',
			icon: 'directions-bike',
			units: [{ title: 'km', value: 'km', default: true }]
		},
		{
			name: 'Cycling (calories)',
			color: '#81CFE0',
			icon: 'directions-bike',
			units: [{ title: 'kcal', value: 'kcal', default: true }]
		},
		{
			name: 'Cycling (duration)',
			color: '#ECF0F1',
			icon: 'directions-bike',
			units: [{ title: 'minutes', value: 'mins', default: true }]
		}
	])
	.service('presetTraqs', function () {
		return [
			{
				id: 'weight',
				title: 'Weight',
				icon: 'filter-frames',

				charts: [
					{
						type: 'line',
						requireColumns: ['Weight'],
						columns: [{ name: 'Weight', axis: 'left' }]
					}
				],

				insights: [
					{
						title: 'Change',
						requireColumns: ['Weight'],
						html: function (traq, data) {
							var weight = _.findWhere(data, { name: 'Weight' }),
								weights = weight.measurements;
							if (!weights || !weights.length) { return ''; }
							var weightA = _.first(weights).value,
								weightB = _.last(weights).value,
								weightUnit = weight.unit,
								icon = weightA > weightB ? 'arrow-drop-down' : 'arrow-drop-up';
							return '<span class="mi mi-24 mi-' + icon + '"></span>' + Math.round((weightB - weightA) * 10) / 10 + ' <span class="unit">' + weightUnit + '</span>';
						}
					},
					{
						title: 'Weight',
						requireColumns: ['Weight'],
						html: function (traq, data) {
							var weight = _.findWhere(data, { name: 'Weight' }),
								weights = weight.measurements;
							if (!weights || !weights.length) { return ''; }
							var latestWeight = _.last(weights).value,
								weightUnit = weight.unit;
							return latestWeight + ' <span class="unit">' + weightUnit + '</span>';
						}
					},
					{
						title: 'BMI',
						requireColumns: ['Weight', 'Height'],
						html: function (traq, data) {
							var weight = _.findWhere(data, { name: 'Weight' }),
								weights = weight.measurements,
								height = _.findWhere(data, { name: 'Height' }),
								heights = height.measurements;
							if (!heights || !weights || !heights.length || !weights.length) { return ''; }
							var latestHeight = _.last(heights).value, // TODO: unit conversion to m
								latestWeight = _.last(weights).value; // TODO: unit conversion to kg
							return String(Math.round(latestWeight / (latestHeight * latestHeight) * 10) / 10);
						}
					}
				]
			},
			{
				id: 'heart-rate',
				title: 'Heart rate',
				icon: 'favorite',
				charts: [
					{
						type: 'line',
						requireColumns: ['Heart rate'],
						columns: [{ name: 'Heart rate', axis: 'left' }]
					}
				],
				insights: [
					{
						title: 'Lowest',
						requireColumns: ['Heart rate'],
						html: function (traq, data) {
							var bpm = _.findWhere(data, { name: 'Heart rate' }),
								bpms = bpm.measurements;
							if (!bpms || !bpms.length) { return ''; }
							return Math.round(_.min(bpms, 'value').value) + ' <span class="unit">bpm</span>';
						}
					},
					{
						title: 'Average',
						requireColumns: ['Heart rate'],
						html: function (traq, data) {
							var bpm = _.findWhere(data, { name: 'Heart rate' }),
								bpms = bpm.measurements;
							if (!bpms || !bpms.length) { return ''; }
							return Math.round(_.sum(bpms, 'value') / bpms.length) + ' <span class="unit">bpm</span>';
						}
					},
					{
						title: 'Highest',
						requireColumns: ['Heart rate'],
						html: function (traq, data) {
							var bpm = _.findWhere(data, { name: 'Heart rate' }),
								bpms = bpm.measurements;
							if (!bpms || !bpms.length) { return ''; }
							return Math.round(_.max(bpms, 'value').value) + ' <span class="unit">bpm</span>';
						}
					}
				]
			},
			{
				id: 'sleep',
				title: 'Sleep',
				icon: 'airline-seat-individual-suite',
				charts: [
					{
						type: 'line',
						requireColumns: ['Hours slept'],
						columns: [{ name: 'Hours slept', axis: 'left' }]
					}
				],
				insights: [
					{
						title: 'Least',
						requireColumns: ['Hours slept'],
						html: function (traq, data) {
							var bpm = _.findWhere(data, { name: 'Hours slept' }),
								bpms = bpm.measurements;
							if (!bpms || !bpms.length) { return ''; }
							return Math.round(_.min(bpms, 'value').value) + ' <span class="unit">hrs</span>';
						}
					},
					{
						title: 'Average',
						requireColumns: ['Hours slept'],
						html: function (traq, data) {
							var bpm = _.findWhere(data, { name: 'Hours slept' }),
								bpms = bpm.measurements;
							if (!bpms || !bpms.length) { return ''; }
							return Math.round(_.sum(bpms, 'value') / bpms.length) + ' <span class="unit">hrs</span>';
						}
					},
					{
						title: 'Most',
						requireColumns: ['Hours slept'],
						html: function (traq, data) {
							var bpm = _.findWhere(data, { name: 'Hours slept' }),
								bpms = bpm.measurements;
							if (!bpms || !bpms.length) { return ''; }
							return Math.round(_.max(bpms, 'value').value) + ' <span class="unit">hrs</span>';
						}
					}
				]
			},
			{
				id: 'steps',
				title: 'Steps',
				icon: 'directions-walk',
				charts: [
					{
						type: 'line',
						requireColumns: ['Running (steps)', 'Walking (steps)'],
						columns: [
							{ name: 'Running (steps)', axis: 'left' },
							{ name: 'Walking (steps)', axis: 'left' }
						]
					}
				]
			},
			{
				id: 'calories-burnt',
				title: 'Calories burnt',
				icon: 'directions-walk',
				charts: [
					{
						type: 'line',
						requireColumns: ['Running (calories)', 'Walking (calories)', 'Cycling (calories)'],
						columns: [
							{ name: 'Running (calories)', axis: 'left' },
							{ name: 'Walking (calories)', axis: 'left' },
							{ name: 'Cycling (calories)', axis: 'left' }
						]
					}
				]
			},
			{
				id: 'distance-travelled',
				title: 'Distance travelled',
				icon: 'directions-walk',
				charts: [
					{
						type: 'line',
						requireColumns: ['Running (distance)', 'Walking (distance)', 'Cycling (distance)'],
						columns: [
							{ name: 'Running (distance)', axis: 'left' },
							{ name: 'Walking (distance)', axis: 'left' },
							{ name: 'Cycling (distance)', axis: 'left' }
						]
					}
				]
			},
			{
				id: 'physical-activity-duration',
				title: 'Physical activity duration',
				icon: 'directions-walk',
				charts: [
					{
						type: 'line',
						requireColumns: ['Running (duration)', 'Walking (duration)', 'Cycling (duration)'],
						columns: [
							{ name: 'Running (duration)', axis: 'left' },
							{ name: 'Walking (duration)', axis: 'left' },
							{ name: 'Cycling (duration)', axis: 'left' }
						]
					}
				]
			} //,
			/*
			{
				id: 'walking-distance',
				title: 'Walking distance',
				icon: 'directions-walk',
				category: 'health'
			},
			{
				id: 'calories',
				title: 'Calories',
				icon: 'local-pizza',
				category: 'health'
			}*/
			// @@FULL_PRESETS
		];
	});
