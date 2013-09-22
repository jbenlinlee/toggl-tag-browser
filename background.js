chrome.app.runtime.onLaunched.addListener(function() {
	var xhr = new XMLHttpRequest();
	xhr.open('GET','https://www.toggl.com/api/v8/me');
	xhr.setRequestHeader('Authorization','Basic YmFjOWJlNzU2N2U5ZDJiMzc1OTZkYjQyN2M0M2M5ZjE6YXBpX3Rva2Vu');
	xhr.onload = function() { console.log(JSON.parse(xhr.responseText)); };
	xhr.send();
})
