function TagBrowserCtrl($scope) {
	$scope.entryRangeFormat = 'ddd, MMM D YYYY';

	$scope.startDate = moment().subtract('days',7);
	$scope.startDateLabel = $scope.startDate.format($scope.entryRangeFormat);

	$scope.endDate = moment();
	$scope.endDateLabel = $scope.endDate.format($scope.entryRangeFormat);
	
	$scope.entries = [];
	$scope.filteredEntries = [];
	$scope.projects = [];
	$scope.tags = [];

	function requestTimeEntries() {
		var msg = {type:'entries', start:$scope.startDate.valueOf(), stop:$scope.endDate.valueOf()};
		chrome.runtime.sendMessage(msg, function(response) {
				console.log('Got ' + response.entries.length + ' entries');
				$scope.$apply(function() {
					$scope.entries = response.entries;
					var projects = {};
					$scope.entries.forEach(function(entry) {
						if (entry.duration > 0) {
							if (projects[entry.pid] === undefined) {
								projects[entry.pid] = entry.duration;
							} else {
								projects[entry.pid] += entry.duration;
							}
						}
					});

					var plotData = [];
					for (var entry in projects) {
						plotData.push({label:entry,data:projects[entry]});
					}

					$.plot('#projectChart', plotData, {series:{pie:{show:true}}});
								
				});
			});
	}

	function changeEntryRange(start,end) {
		$scope.startDate = start;
		$scope.startDateLabel = $scope.startDate.format($scope.entryRangeFormat);
		$scope.endDate = end;
		$scope.endDateLabel = $scope.endDate.format($scope.entryRangeFormat);
		
		requestTimeEntries();
	}

	$(document).ready(function() {
		$('div#reportrange').daterangepicker({
			startDate:$scope.startDate,
			endDate:$scope.endDate
		}, function(start,end) { 
			$scope.$apply(changeEntryRange(start,end));
		});

		requestTimeEntries();
	});
}

