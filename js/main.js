function TagBrowserCtrl($scope) {
	$scope.startDate = new Date();
	$scope.startDateLabel = $scope.startDate.toDateString();
	$scope.endDate = new Date();
	$scope.endDateLabel = $scope.endDate.toDateString();
	
	$scope.entries = [];

	console.log("TagBrowserCtrl instantiate");
}

$(document).ready(function() {
	$('div#reportrange').daterangepicker();
});
