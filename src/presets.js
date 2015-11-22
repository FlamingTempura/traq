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
			name: 'COLUMN_WEIGHT',
			color: '#87D37C',
			icon: 'filter-frames',
			units: [
				{ title: 'UNIT_KILOGRAM', value: 'UNIT_KILOGRAM_ABBRV', default: true },
				{ title: 'UNIT_POUND', value: 'UNIT_POUND_ABBRV' },
				{ title: 'UNIT_STONE', value: 'UNIT_STONE_ABBRV' }],
			forecast: { before: true, after: true }
		},
		{
			name: 'COLUMN_HEART_RATE',
			color: '#F22613',
			icon: 'favorite',
			units: [{ title: 'UNIT_BPM', value: 'UNIT_BPM', default: true }]
		},
		{
			name: 'COLUMN_HOURS_SLEPT',
			color: '#81CFE0',
			icon: 'airline-seat-individual-suite',
			units: [{ title: 'UNIT_HOUR', value: 'UNIT_HOUR', default: true }]
		},
		{
			name: 'COLUMN_HEIGHT',
			color: '#F4D03F',
			icon: 'straighten',
			units: [
				{ title: 'UNIT_METER', value: 'UNIT_METER_ABBRV', default: true },
				{ title: 'UNIT_FOOT', value: 'UNIT_FOOT_ABBRV' }],
			forecast: { before: true, after: true }
		},
		{
			name: 'COLUMN_WALKING_STEPS',
			color: '#03C9A9',
			icon: 'directions-walk',
			units: [{ title: 'UNIT_STEPS', value: 'UNIT_STEPS_ABBRV', default: true }]
		},
		{
			name: 'COLUMN_WALKING_DISTANCE',
			color: '#F22613',
			icon: 'directions-walk',
			units: [{ title: 'UNIT_KILOMETER', value: 'UNIT_KILOMETER_ABBRV', default: true }]
		},
		{
			name: 'COLUMN_WALKING_CALORIES',
			color: '#F89406',
			icon: 'directions-walk',
			units: [{ title: 'UNIT_KILOCALORIES', value: 'UNIT_KILOCALORIES_ABBRV', default: true }]
		},
		{
			name: 'COLUMN_WALKING_DURATION',
			color: '#87D37C',
			icon: 'directions-walk',
			units: [{ title: 'UNIT_MINUTES', value: 'UNIT_MINUTES_ABBRV', default: true }]
		},
		{
			name: 'COLUMN_RUNNING_DISTANCE',
			color: '#ED009A',
			icon: 'directions-run',
			units: [{ title: 'UNIT_KILOMETER', value: 'UNIT_KILOMETER_ABBRV', default: true }]
		},
		{
			name: 'COLUMN_RUNNING_CALORIES',
			color: '#F9690E',
			icon: 'directions-run',
			units: [{ title: 'UNIT_KILOCALORIES', value: 'UNIT_KILOCALORIES_ABBRV', default: true }]
		},
		{
			name: 'COLUMN_RUNNING_STEPS',
			color: '#F4D03F',
			icon: 'directions-run',
			units: [{ title: 'UNIT_STEPS', value: 'UNIT_STEPS_ABBRV', default: true }]
		},
		{
			name: 'COLUMN_RUNNING_DURATION',
			color: '#03C9A9',
			icon: 'directions-run',
			units: [{ title: 'UNIT_MINUTES', value: 'UNIT_MINUTES_ABBRV', default: true }]
		},
		{
			name: 'COLUMN_CYCLING_DISTANCE',
			color: '#19B5FE',
			icon: 'directions-bike',
			units: [{ title: 'UNIT_KILOMETER', value: 'UNIT_KILOMETER_ABBRV', default: true }]
		},
		{
			name: 'COLUMN_CYCLING_CALORIES',
			color: '#81CFE0',
			icon: 'directions-bike',
			units: [{ title: 'UNIT_KILOCALORIES', value: 'UNIT_KILOCALORIES_ABBRV', default: true }]
		},
		{
			name: 'COLUMN_CYCLING_DURATION',
			color: '#ECF0F1',
			icon: 'directions-bike',
			units: [{ title: 'UNIT_MINUTES', value: 'UNIT_MINUTES_ABBRV', default: true }]
		}
	])
	.service('presetTraqs', function () {
		return [
			{
				id: 'weight',
				title: 'TRAQ_WEIGHT',
				icon: 'filter-frames',

				charts: [
					{
						type: 'line',
						requireColumns: ['COLUMN_WEIGHT'],
						columns: [{ name: 'COLUMN_WEIGHT', axis: 'left' }]
					}
				],

				insights: [
					{
						title: 'CHANGE',
						requireColumns: ['COLUMN_WEIGHT'],
						html: function (traq, data) {
							var weight = _.findWhere(data, { name: 'COLUMN_WEIGHT' }),
								weights = weight.measurements;
							if (!weights || !weights.length) { return ''; }
							var weightA = _.first(weights).value,
								weightB = _.last(weights).value,
								weightUnit = weight.unit,
								icon = weightA > weightB ? 'arrow-drop-down' : 'arrow-drop-up';
							return '<span class="mi mi-24 mi-' + icon + '"></span>' +
								'{{ ' + Math.round((weightB - weightA) * 10) / 10 + ' | localeNumber }} ' +
								'<span class="unit">{{ "' + weightUnit + '" | translate }}</span>';
						}
					},
					{
						title: 'TRAQ_WEIGHT',
						requireColumns: ['COLUMN_WEIGHT'],
						html: function (traq, data) {
							var weight = _.findWhere(data, { name: 'COLUMN_WEIGHT' }),
								weights = weight.measurements;
							if (!weights || !weights.length) { return ''; }
							var latestWeight = _.last(weights).value,
								weightUnit = weight.unit;
							return '{{ ' + latestWeight + ' | localeNumber }} ' +
								'<span class="unit">{{ "' + weightUnit + '" | translate }}</span>';
						}
					},
					{
						title: 'TRAQ_WEIGHT_BMI',
						requireColumns: ['COLUMN_WEIGHT', 'COLUMN_HEIGHT'],
						html: function (traq, data) {
							var weight = _.findWhere(data, { name: 'COLUMN_WEIGHT' }),
								weights = weight.measurements,
								height = _.findWhere(data, { name: 'COLUMN_HEIGHT' }),
								heights = height.measurements;
							if (!heights || !weights || !heights.length || !weights.length) { return ''; }
							var latestHeight = _.last(heights).value, // TODO: unit conversion to m
								latestWeight = _.last(weights).value; // TODO: unit conversion to kg
							return '{{ ' + Math.round(latestWeight / (latestHeight * latestHeight) * 10) / 10 + ' | localeNumber }}';
						}
					}
				]
			},
			{
				id: 'heart-rate',
				title: 'TRAQ_HEART_RATE',
				icon: 'favorite',
				charts: [
					{
						type: 'line',
						requireColumns: ['COLUMN_HEART_RATE'],
						columns: [{ name: 'COLUMN_HEART_RATE', axis: 'left' }]
					}
				],
				insights: [
					{
						title: 'LOWEST',
						requireColumns: ['COLUMN_HEART_RATE'],
						html: function (traq, data) {
							var bpm = _.findWhere(data, { name: 'COLUMN_HEART_RATE' }),
								bpms = bpm.measurements;
							if (!bpms || !bpms.length) { return ''; }
							return '{{ ' + Math.round(_.min(bpms, 'value').value) + ' | localeNumber }} <span class="unit">bpm</span>';
						}
					},
					{
						title: 'AVERAGE',
						requireColumns: ['COLUMN_HEART_RATE'],
						html: function (traq, data) {
							var bpm = _.findWhere(data, { name: 'COLUMN_HEART_RATE' }),
								bpms = bpm.measurements;
							if (!bpms || !bpms.length) { return ''; }
							return '{{ ' + Math.round(_.sum(bpms, 'value') / bpms.length) + ' | localeNumber }} <span class="unit">bpm</span>';
						}
					},
					{
						title: 'HIGHEST',
						requireColumns: ['COLUMN_HEART_RATE'],
						html: function (traq, data) {
							var bpm = _.findWhere(data, { name: 'COLUMN_HEART_RATE' }),
								bpms = bpm.measurements;
							if (!bpms || !bpms.length) { return ''; }
							return '{{ ' + Math.round(_.max(bpms, 'value').value) + ' | localeNumber }} <span class="unit">bpm</span>';
						}
					}
				]
			},
			{
				id: 'sleep',
				title: 'TRAQ_SLEEP',
				icon: 'airline-seat-individual-suite',
				charts: [
					{
						type: 'line',
						requireColumns: ['COLUMN_HOURS_SLEPT'],
						columns: [{ name: 'COLUMN_HOURS_SLEPT', axis: 'left' }]
					}
				],
				insights: [
					{
						title: 'LEAST',
						requireColumns: ['COLUMN_HOURS_SLEPT'],
						html: function (traq, data) {
							var bpm = _.findWhere(data, { name: 'COLUMN_HOURS_SLEPT' }),
								bpms = bpm.measurements;
							if (!bpms || !bpms.length) { return ''; }
							return Math.round(_.min(bpms, 'value').value) + ' <span class="unit">hrs</span>';
						}
					},
					{
						title: 'AVERAGE',
						requireColumns: ['COLUMN_HOURS_SLEPT'],
						html: function (traq, data) {
							var bpm = _.findWhere(data, { name: 'COLUMN_HOURS_SLEPT' }),
								bpms = bpm.measurements;
							if (!bpms || !bpms.length) { return ''; }
							return Math.round(_.sum(bpms, 'value') / bpms.length) + ' <span class="unit">hrs</span>';
						}
					},
					{
						title: 'MOST',
						requireColumns: ['COLUMN_HOURS_SLEPT'],
						html: function (traq, data) {
							var bpm = _.findWhere(data, { name: 'COLUMN_HOURS_SLEPT' }),
								bpms = bpm.measurements;
							if (!bpms || !bpms.length) { return ''; }
							return Math.round(_.max(bpms, 'value').value) + ' <span class="unit">hrs</span>';
						}
					}
				]
			},
			{
				id: 'steps',
				title: 'TRAQ_STEPS',
				icon: 'directions-walk',
				charts: [
					{
						type: 'line',
						requireColumns: ['COLUMN_RUNNING_STEPS', 'COLUMN_WALKING_STEPS'],
						columns: [
							{ name: 'COLUMN_RUNNING_STEPS', axis: 'left' },
							{ name: 'COLUMN_WALKING_STEPS', axis: 'left' }
						]
					}
				]
			},
			{
				id: 'calories-burnt',
				title: 'TRAQ_CALORIES_BURNT',
				icon: 'directions-walk',
				charts: [
					{
						type: 'line',
						requireColumns: ['COLUMN_RUNNING_CALORIES', 'COLUMN_WALKING_CALORIES', 'COLUMN_CYCLING_CALORIES'],
						columns: [
							{ name: 'COLUMN_RUNNING_CALORIES', axis: 'left' },
							{ name: 'COLUMN_WALKING_CALORIES', axis: 'left' },
							{ name: 'COLUMN_CYCLING_CALORIES', axis: 'left' }
						]
					}
				]
			},
			{
				id: 'distance-travelled',
				title: 'TRAQ_DISTANCE_TRAVELLED',
				icon: 'directions-walk',
				charts: [
					{
						type: 'line',
						requireColumns: ['COLUMN_RUNNING_DISTANCE', 'COLUMN_WALKING_DISTANCE', 'COLUMN_CYCLING_DISTANCE'],
						columns: [
							{ name: 'COLUMN_RUNNING_DISTANCE', axis: 'left' },
							{ name: 'COLUMN_WALKING_DISTANCE', axis: 'left' },
							{ name: 'COLUMN_CYCLING_DISTANCE', axis: 'left' }
						]
					}
				]
			},
			{
				id: 'physical-activity-duration',
				title: 'TRAQ_PHYSICAL_ACTIVITY_DURATION',
				icon: 'directions-walk',
				charts: [
					{
						type: 'line',
						requireColumns: ['COLUMN_RUNNING_DURATION', 'COLUMN_WALKING_DURATION', 'COLUMN_CYCLING_DURATION'],
						columns: [
							{ name: 'COLUMN_RUNNING_DURATION', axis: 'left' },
							{ name: 'COLUMN_WALKING_DURATION', axis: 'left' },
							{ name: 'COLUMN_CYCLING_DURATION', axis: 'left' }
						]
					}
				]
			} //,
			/*
			{
				id: 'calories',
				title: 'Calories',
				icon: 'local-pizza',
				category: 'health'
			}*/
			// @@FULL_PRESETS
		];
	});
