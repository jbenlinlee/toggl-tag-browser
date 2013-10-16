function TagBrowserCtrl($scope) {
	$scope.entryRangeFormat = 'ddd, MMM D YYYY';

	$scope.startDate = moment().subtract('days',7);
	$scope.startDateLabel = $scope.startDate.format($scope.entryRangeFormat);

	$scope.endDate = moment();
	$scope.endDateLabel = $scope.endDate.format($scope.entryRangeFormat);
	
	$scope.projects = {};
	$scope.workspaces = {};
	$scope.tags = {};

	$scope.activeWorkspaces = {};
	$scope.activeProjects = {};
	$scope.activeTags = {};
	$scope.activeEntries = [];
	$scope.filteredEntries = [];

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

	function processEntrySetChange() {
		$scope.activeWorkspaces = {};
		$scope.activeProjects = {};
		$scope.activeTags = {};

		$scope.activeEntries.forEach(function(entry) {
			if (entry.duration > 0) { // There could be entries in progress
				$scope.activeWorkspaces[entry.wid] = ($scope.activeWorkspaces[entry.wid] ? $scope.activeWorkspaces[entry.wid] : 0) + entry.duration;
				$scope.activeProjects[entry.pid] = ($scope.activeProjects[entry.pid] ? $scope.activeProjects[entry.pid] : 0) + entry.duration;
				entry.tags.forEach(function(tag) {
					if (tag.length > 0) {
						$scope.activeTags[tag] = ($scope.activeTags[tag] ? $scope.activeTags[tag] : 0) + entry.duration;
					}
				});
			}
		});
	}

	$scope.toggleProject = function(project_id) {
		$scope.projects[project_id].selected = !($scope.projects[project_id].selected || false);
	}

	$scope.btnForProject = function(project_id) {
		return ($scope.projects[project_id].selected || false) ? "btn-success" : "btn-default";
	}

	$scope.$watch("activeEntries", function(newValue,oldValue) {
		processEntrySetChange();
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

