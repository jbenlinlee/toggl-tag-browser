function TagBrowserCtrl($scope) {
	$scope.entryRangeFormat = 'ddd, MMM D YYYY';

	$scope.startDate = moment().subtract('days',7);
	$scope.startDateLabel = $scope.startDate.format($scope.entryRangeFormat);

	$scope.endDate = moment();
	$scope.endDateLabel = $scope.endDate.format($scope.entryRangeFormat);
	
	$scope.entries = [];

	$(document).ready(function() {
		$('div#reportrange').daterangepicker({
			startDate:$scope.startDate,
			endDate:$scope.endDate
		});
	});
}

