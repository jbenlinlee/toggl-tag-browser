var tagBrowserModule = angular.module('toggl-tag-browser', []);

tagBrowserModule.directive('durationShareChart', function() {
	return function(scope, elem, attrs) {
		attrs.$observe('ngTag', function(tag) {
			var tagData = scope.filteredTagTimeSeries[tag];

			console.debug("rendering duration share chart for tag " + tag);
			console.debug(tagData);

			var plotData = [
				{label:tag, data:tagData.durationShare},
				{label:"other", data:(1 - tagData.durationShare)}
			];
		
			// Flot	
			$.plot(elem, plotData, {
				series: {
					pie: {
						show:true,
						radius:1,
						stroke: {width:0},
						label: {show:false}
					}
				},
				colors: ["#F5D908", "#3F3F3F"],
				legend: {
					show: false
				}});

			// Bootstrap tooltip
			var popupText = Math.floor(tagData.durationShare * 100) + "%; " +
				moment.duration(tagData.duration * 1000).humanize();

			$(elem).tooltip({title:popupText, placement:"right"});
		});
	};
});

tagBrowserModule.
	controller('TagBrowserCtrl', ['$scope', function($scope) {
		$scope.entryRangeFormat = 'ddd, MMM D YYYY';

		$scope.endDate = moment(moment().format("YYYY-MM-DD"));
		$scope.endDateLabel = $scope.endDate.format($scope.entryRangeFormat);

		$scope.startDate = moment($scope.endDate);
		$scope.startDate.subtract('days',7);
		$scope.startDateLabel = $scope.startDate.format($scope.entryRangeFormat);
	
		$scope.projects = {};    // All projects
		$scope.workspaces = {};  // All workspaces
		$scope.tags = {};

		$scope.activeEntries = [];     // Entries in selected dates
		$scope.activeProjects = {};    // Projects in active entries
		$scope.filteredEntries = [];   // Entries selected by project and tag
		$scope.filteredTags = {};      // Tags in selected projects
		$scope.filteredTagsIndex = []; 
		$scope.filteredTagTimeSeries = {};
		$scope.filteredTagTimeSeriesIndex = [];

		function requestTimeEntries() {
			console.log("Fetching new time entries");
			var msg = {type:'entries', start:$scope.startDate.valueOf(), stop:$scope.endDate.valueOf()};
			chrome.runtime.sendMessage(msg, function(response) {
					console.log('Got ' + response.entries.length + ' entries');
					$scope.$apply(function() {
						$scope.activeEntries = response.entries;
						$scope.filteredEntries = $scope.activeEntries;
					});
				});
		}

		function requestProjects(callback) {
			var msg = {type:'projects'};
			chrome.runtime.sendMessage(msg, function(response) {
				$scope.projects = response.projects;
				$scope.workspaces = response.workspaces;
				console.log(response);
				callback();
			})
		}

		function startup() {
			requestProjects(requestTimeEntries);
		}
		
		function changeEntryRange(start,end) {
			$scope.startDate = moment(start.format("YYYY-MM-DD"), "YYYY-MM-DD");
			$scope.startDateLabel = $scope.startDate.format($scope.entryRangeFormat);
			$scope.endDate = moment(end.format("YYYY-MM-DD", "YYYY-MM-DD"));
			$scope.endDateLabel = $scope.endDate.format($scope.entryRangeFormat);
		
			console.log("Got new time range");
			requestTimeEntries();
		}

		function updateFilteredEntrySet() {
			console.log("Updating filtered entries set");
			$scope.filteredEntries = [];
	
			var selectedTags = [];

			for (var tag in $scope.filteredTags) {
				if ($scope.filteredTags[tag].selected) {
					selectedTags.push(tag);
				}
			}

			$scope.activeEntries.forEach(function(entry) {
				if ($scope.projects[entry.pid].selected && entry.duration > 0) {
					var entryActiveTags = 0;

					if (selectedTags.length > 0) {
						selectedTags.forEach(function(tag) {
							entry.tags.forEach(function(entryTag) {
								if (entryTag === tag) {
									++entryActiveTags;
								}
							});
						});
					}

					if (selectedTags.length == 0 || entryActiveTags == selectedTags.length) {
						$scope.filteredEntries.push(entry);
					}
				}
			});
		}

		function updateFilteredTagSet() {
			console.log("Updating filtered tag set");
			$scope.filteredTags = {};
			$scope.numFilteredTags = 0;

			$scope.activeEntries.forEach(function(entry) {
				if ($scope.projects[entry.pid].selected) {
					entry.tags.forEach(function(tag) {
						if (tag.length > 0) {
							$scope.filteredTags[tag] = {tag:tag, selected:false};
						}
					});
				}
			})

			$scope.filteredTagsIndex = [];
			for (var tag in $scope.filteredTags) {
				$scope.filteredTagsIndex.push(tag);
			}
		}

		function createTimeArray(daysInRange) {
			var arr = new Array(daysInRange);
			for (var i = 0; i < daysInRange; ++i) {
				arr[i] = [i,0];
			}

			return arr;
		}

		function updateTagTimeSeries() {
			console.log("Updating tag time series");
			$scope.filteredTagTimeSeries = {};
			$scope.filteredTagTimeSeriesIndex = [];

			if ($scope.filteredEntries.length > 0) {
				var daysInRange = Math.floor(moment.duration($scope.endDate.valueOf() - $scope.startDate.valueOf()).asDays()) + 1;
				$scope.filteredTagTimeSeries['ALL'] = createTimeArray(daysInRange);

				var totalDuration = 0;

				$scope.filteredEntries.forEach(function(entry) {
					if (entry.duration > 0) {
						totalDuration += entry.duration;

						var entryMoment = moment(entry.start);
						var entryDate = moment(entryMoment.format("YYYY-MM-DD"));
						var dayIndex = Math.floor(moment.duration(entryDate.valueOf() - $scope.startDate.valueOf()).asDays());
						$scope.filteredTagTimeSeries['ALL'][dayIndex][1] += entry.duration;

						entry.tags.forEach(function(tag) {
							if ($scope.filteredTags[tag] && !$scope.filteredTags[tag].selected) {
								$scope.filteredTagTimeSeries[tag] = ($scope.filteredTagTimeSeries[tag] || createTimeArray(daysInRange));
								$scope.filteredTagTimeSeries[tag][dayIndex][1] += entry.duration;
							}
						});
					}
				});

				for (var tag in $scope.filteredTagTimeSeries) {
					var dataSeries = $scope.filteredTagTimeSeries[tag];
					var seriesDuration = 0;
					for (var i = 0; i < dataSeries.length; ++i) {
						seriesDuration += dataSeries[i][1];
					}

					$scope.filteredTagTimeSeries[tag] = {duration:seriesDuration, durationShare:(seriesDuration/totalDuration), timeSeries:dataSeries};

					$scope.filteredTagTimeSeriesIndex.push(tag);
				}

				$scope.filteredTagTimeSeriesIndex.sort(function(a, b) {
					aTagData = $scope.filteredTagTimeSeries[a];
					bTagData = $scope.filteredTagTimeSeries[b];

					if (a === "ALL" || aTagData.duration > bTagData.duration) {
						return -1;
					} else if (aTagData.duration === bTagData.duration) {
						return 0;
					}
					
					return 1;
				});

				console.log($scope.filteredTagTimeSeries);
			}
		}

		function processEntrySetChange() {
			console.log("Processing entry set change");

			$scope.activeProjects = {};
			$scope.filteredTags = {};
			$scope.filteredTagTimeSeries = {};

			for (var pid in $scope.projects) {
				$scope.projects[pid].selected = false;
			}

			$scope.activeEntries.forEach(function(entry) {
				if (entry.duration > 0) { // There could be entries in progress
					$scope.activeProjects[entry.pid] = ($scope.activeProjects[entry.pid] || 0) + entry.duration;
				}
			});

			updateFilteredEntrySet();
		}

		$scope.allTagsFilter = function(tag) {
			return true;
		}

		$scope.tagTimeSeriesOrdering = function(tag,actual) {
		}

		$scope.renderTagTimeSeries = function(tag, plotdiv) {
			var divElem = document.getElementById(plotdiv);

			if (tag !== undefined && divElem && $scope.filteredTagTimeSeries[tag] !== undefined) {
				console.log("Rendering time series for " + tag + " into " + plotdiv);

				$.plot(divElem,
					[{
						data:$scope.filteredTagTimeSeries[tag].timeSeries,
						color:"#3F3F3F",
						shadowSize:0,
						lines:{
							show:true,
							lineWidth:1,
							fill:false,
							fillColor:"#3F3F3F"
						},
						points:{
							show:true,
							radius:2
						},
						bars:{
							show:false,
							fillColor:"#3F3F3F",
							barWidth:0.1
						}}],
					{
						grid: {
							show:false,
							margin: {top:7, bottom:7, right:7, left:7},
							hoverable:true
						}
					});
			}
		}

		$scope.toggleProject = function(project_id) {
			$scope.projects[project_id].selected = !($scope.projects[project_id].selected || false);
			console.log("Project " + project_id + " is now selected=" + $scope.projects[project_id].selected);
			updateFilteredTagSet();
			updateFilteredEntrySet();
		}

		$scope.toggleTag = function(tag) {
			$scope.filteredTags[tag].selected = !($scope.filteredTags[tag].selected || false);
			console.log("Tag " + tag + " is now selected=" + $scope.filteredTags[tag].selected);
			updateFilteredEntrySet();
		}

		$scope.btnForProject = function(project_id) {
			return ($scope.projects[project_id].selected || false) ? "btn-success" : "btn-default";
		}

		$scope.btnForTag = function(tag) {
			return ($scope.filteredTags[tag].selected || false) ? "btn-success" : "btn-default";
		}

		$scope.$watch("activeEntries", function(newValue,oldValue) {
			console.log("Detected change in active entries.");
			processEntrySetChange();
		});

		$scope.$watch("filteredEntries", function(newValue,oldValue) {
			console.log("Detected change in filtered entries.");
			updateTagTimeSeries();
		});

		$(document).ready(function() {
			$('div#reportrange').daterangepicker({
				startDate:$scope.startDate,
				endDate:$scope.endDate
			}, function(start,end) { 
				$scope.$apply(changeEntryRange(start,end));
			});

			startup();
		});
	}]);

