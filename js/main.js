function TagBrowserCtrl($scope) {
	$scope.entryRangeFormat = 'ddd, MMM D YYYY';

	$scope.startDate = moment().subtract('days',7);
	$scope.startDateLabel = $scope.startDate.format($scope.entryRangeFormat);

	$scope.endDate = moment();
	$scope.endDateLabel = $scope.endDate.format($scope.entryRangeFormat);
	
	$scope.projects = {};    // All projects
	$scope.workspaces = {};  // All workspaces
	$scope.tags = {};

	$scope.activeEntries = [];     // Entries in selected dates
	$scope.activeProjects = {};    // Projects in active entries
	$scope.filteredEntries = [];   // Entries selected by project and tag
	$scope.filteredTags = {};      // Tags in selected projects
	$scope.filteredTagTimeSeries = {};

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
		$scope.startDate = start;
		$scope.startDateLabel = $scope.startDate.format($scope.entryRangeFormat);
		$scope.endDate = end;
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

		if ($scope.filteredEntries.length > 0) {
			var daysInRange = Math.floor(moment.duration($scope.endDate - $scope.startDate).asDays()) + 1;
			$scope.filteredTagTimeSeries['ALL'] = createTimeArray(daysInRange);

			$scope.filteredEntries.forEach(function(entry) {
				if (entry.duration > 0) {
					var dayIndex = Math.floor(moment.duration(moment(entry.start) - $scope.startDate).asDays());
					$scope.filteredTagTimeSeries['ALL'][dayIndex][1] += entry.duration;

					entry.tags.forEach(function(tag) {
						if ($scope.filteredTags[tag] && !$scope.filteredTags[tag].selected) {
							$scope.filteredTagTimeSeries[tag] = ($scope.filteredTagTimeSeries[tag] || createTimeArray(daysInRange));
							$scope.filteredTagTimeSeries[tag][dayIndex][1] += entry.duration;
						}
					});
				}
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

	$scope.allFreeTagsFilter = function(tag) {
		return tag !== 'ALL';
	}

	$scope.renderTagTimeSeries = function(tag, plotdiv) {
		var divElem = document.getElementById(plotdiv);

		if (tag !== undefined && divElem && $scope.filteredTagTimeSeries[tag] !== undefined) {
			console.log("Rendering time series for " + tag + " into " + plotdiv);

			$.plot(divElem, [{
				data:$scope.filteredTagTimeSeries[tag],
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
					radius:1
				},
				bars:{
					show:false,
					fillColor:"#3F3F3F",
					barWidth:0.1
				}}], {grid:{show:false}});
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
}

