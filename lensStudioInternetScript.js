// @input string serverUrl
const InternetModule = require("LensStudio:InternetModule");

const baseUrl = script.serverUrl.replace(/\/+$/, "");

InternetModule.fetch(baseUrl + "/ping")
  .then(function(response) {
    print("Status: " + response.status);
    return response.text();
  })
  .then(function(text) {
    print(text);
  })
  .catch(function(err) {
    print("Error: " + err);
  });

  //This script is inteded to go into an object in lens studio. It will make a request to the server.