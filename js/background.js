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

	return true;
}

togglEntries = function(start,stop,callback) {
	var date_start = new Date(start);
	var date_stop = new Date(stop);
	var call = '/time_entries?start_date=' + encodeURIComponent(date_start.toISOString()) + '&stop_date=' + encodeURIComponent(date_stop.toISOString());
	console.log('Fetching entry list: start=' + date_start.toISOString() + ' stop=' + date_stop.toISOString());
	return togglRequest('GET', call, function(response) { callback({entries:response}) });
}

togglWorkspaces = function(callback) {
	console.log('Fetching workspaces list');
	var call = '/workspaces';
	return togglRequest('GET', call, function(response) { callback({workspaces:response}) });
}

togglProjectForWorkspace = function(workspaces, widx, projects, callback) {
	if (widx < workspaces.length) {
		console.log('Getting projects for workspace ' + workspaces[widx].id);
		togglRequest('GET', '/workspaces/' + workspaces[widx].id + '/projects', function(response) {
			response.map(function(e) { projects[e.id] = e; });
			togglProjectForWorkspace(workspaces, widx + 1, projects, callback);
		});
	} else {
		callback({workspaces:workspaces, projects:projects});
	}
}

togglProjects = function(callback) {
	console.log('Fetching projects list');
	return togglWorkspaces(function(response) { togglProjectForWorkspace(response.workspaces, 0, {}, callback); });
}

togglTags = function(callback) {
	console.log('Fetching tag list');
}

handleMessage = function(msg,sender,callback) {
	console.log('Got message of type ' + (msg.type !== undefined ? msg.type : 'undefined'));
	console.log(msg);
	switch(msg.type) {
		case 'entries':
			return togglEntries(msg.start, msg.stop, callback);
			break;
		case 'workspaces':
			return togglWorkspaces(callback);
			break;
		case 'projects':
			return togglProjects(callback);
			break;
		case 'tags':
			return togglTags(callback);
			break;
		default:
			break;
	}
}

chrome.app.runtime.onLaunched.addListener(function() {
	chrome.runtime.onMessage.addListener(handleMessage);

	chrome.app.window.create('html/main.html', {
		'bounds':{
			'width':800,
			'height':400
		}
	});
})
