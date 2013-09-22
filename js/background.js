var $togglEndpoint = 'https://www.toggl.com/api/v8';
var $togglAuth = btoa('bac9be7567e9d2b37596db427c43c9f1:api_token');

togglRequest = function(method,api,callback,data) {
	var xhr = new XMLHttpRequest();
	xhr.open(method,$togglEndpoint + api);
	xhr.setRequestHeader('Authorization','Basic ' + $togglAuth);
	xhr.onload = function() { callback(JSON.parse(xhr.responseText)); };
	
	if (data !== undefined) {
		xhr.send(data);
	} else {
		xhr.send();
	}
}

togglEntries = function(start,stop,callback) {
	var date_start = new Date(start);
	var date_stop = new Date(stop);
	var call = '/time_entries?start_date=' + encodeURIComponent(date_start.toISOString()) + '&stop_date=' + encodeURIComponent(date_stop.toISOString());
	console.log('Fetching entry list: start=' + date_start.toISOString() + ' stop=' + date_stop.toISOString());
	togglRequest('GET', call, callback);
}

togglWorkspaces = function(callback) {
	console.log('Fetching workspaces list');
}

togglProjects = function(callback) {
	console.log('Fetching projects list');
}

togglTags = function(callback) {
	console.log('Fetching tag list');
}

handleMessage = function(msg,sender,callback) {
	console.log('Got message of type ' + msg.type !=== undefined ? msg.type : 'undefined');
	switch(msg.type) {
		case 'entries':
			togglEntries(msg.start, msg.stop, callback);
			break;
		case 'workspaces':
			togglWorkspaces(callback);
			break;
		case 'projects':
			togglProjects(callback);
			break;
		case 'tags':
			togglTags(callback);
			break;
		default:
			break;
	}
}

chrome.app.runtime.onLaunched.addListener(function() {
	togglRequest('GET','/me', function(resp) { console.log(JSON.parse(resp)); });
	chrome.runtime.onMessage.addListener(handleMessage);
})
