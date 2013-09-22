var $togglEndpoint = 'https://www.toggl.com/api/v8';
var $togglAuth = btoa('bac9be7567e9d2b37596db427c43c9f1:api_token');

togglRequest = function(method,api,callback,data) {
	var xhr = new XMLHttpRequest();
	xhr.open(method,$togglEndpoint + api);
	xhr.setRequestHeader('Authorization','Basic ' + $togglAuth);
	xhr.onload = function() { callback(xhr.responseText); };
	
	if (data !== undefined) {
		xhr.send(data);
	} else {
		xhr.send();
	}
}

chrome.app.runtime.onLaunched.addListener(function() {
	togglRequest('GET','/me', function(resp) { console.log(JSON.parse(resp)); });
})
