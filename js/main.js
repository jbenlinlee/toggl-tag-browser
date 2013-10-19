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
		
		requestTimeEntries();
	}

	function updateFilteredEntrySet() {
		$scope.filteredEntries = [];

		$scope.activeEntries.forEach(function(entry) {
			if ($scope.projects[entry.pid].selected && entry.duration > 0) {
				var hasActiveTag = false;
				var numSelectedTags = 0;

				for (var tag in $scope.filteredTags) {
					if ($scope.filteredTags[tag].selected) {
						++numSelectedTags;
					}
				}

				if (numSelectedTags > 0) {
					entry.tags.forEach(function(tag) {
						hasActiveTag = hasActiveTag || $scope.filteredTags[tag].selected;
					});
				}

				if (numSelectedTags == 0 || hasActiveTag) {
					$scope.filteredEntries.push(entry);
				}
			}
		});
	}

	function updateFilteredTagSet() {
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
		if ($scope.filteredEntries.length > 0) {
			var daysInRange = Math.floor(moment.duration($scope.endDate - $scope.startDate).asDays()) + 1;
			$scope.filteredTagTimeSeries = {};
			$scope.filteredTagTimeSeries['ALL'] = createTimeArray(daysInRange);
			for (var tag in $scope.filteredTags) {
				if (!$scope.filteredTags[tag].selected) {
					$scope.filteredTagTimeSeries[tag] = createTimeArray(daysInRange);
				}
			}

			$scope.filteredEntries.forEach(function(entry) {
				if (entry.duration > 0) {
					var dayIndex = Math.floor(moment.duration(moment(entry.start) - $scope.startDate).asDays());
					$scope.filteredTagTimeSeries['ALL'][dayIndex][1] += entry.duration;

					entry.tags.forEach(function(tag) {
						if (!$scope.filteredTags[tag].selected) {
							$scope.filteredTagTimeSeries[tag][dayIndex][1] += entry.duration;
						}
					});
				}
			});

			console.log($scope.filteredTagTimeSeries);
		}
	}

	function processEntrySetChange() {
		$scope.activeProjects = {};
		$scope.activeTags = {};

		$scope.activeEntries.forEach(function(entry) {
			if (entry.duration > 0) { // There could be entries in progress
				$scope.activeProjects[entry.pid] = ($scope.activeProjects[entry.pid] || 0) + entry.duration;
			}
		});

		updateFilteredEntrySet();
	}

	$scope.allFilter = function(tag) {
		return tag !== 'ALL';
	}

	$scope.renderTagTimeSeries = function(tag, plotdiv) {
		$.plot(document.getElementById(plotdiv), [{
			data:$scope.filteredTagTimeSeries[tag],
			color:"#3F3F3F",
			shadowSize:0,
			lines:{
				show:true,
				lineWidth:1,
				fill:true,
				fillColor:"#3F3F3F"
			},
			points:{
				show:false,
				radius:1
			}}], {grid:{show:false}});
	}

	$scope.toggleProject = function(project_id) {
		$scope.projects[project_id].selected = !($scope.projects[project_id].selected || false);
		updateFilteredTagSet();
		updateFilteredEntrySet();
	}

	$scope.toggleTag = function(tag) {
		$scope.filteredTags[tag].selected = !($scope.filteredTags[tag].selected || false);
		updateFilteredEntrySet();
	}

	$scope.btnForProject = function(project_id) {
		return ($scope.projects[project_id].selected || false) ? "btn-success" : "btn-default";
	}

	$scope.btnForTag = function(tag) {
		return ($scope.filteredTags[tag].selected || false) ? "btn-success" : "btn-default";
	}

	$scope.$watch("activeEntries", function(newValue,oldValue) {
		processEntrySetChange();
	});

	$scope.$watch("filteredEntries", function(newValue,oldValue) {
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

