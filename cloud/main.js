var async = require("cloud/async.min.js");
var _ = require("underscore");

var GameObject = Parse.Object.extend("Game");
var Team = Parse.Object.extend("Team");
var Tag = Parse.Object.extend("Tag");
var Player = Parse.Object.extend("Player");

require("cloud/capture.js");

Parse.Cloud.job("startGames", function(request, status) {
  // Set up to modify user data
  Parse.Cloud.useMasterKey();

  // Send to all users where game starts now
  var query = new Parse.Query(Game);
  query.greaterThan('startAt', new Date());
  query.equalTo('status', 'informed');
  query.each(function(game) {
    // Start the game
    game.set('status', 'started');
    game.save();
    // Send push notifications
    var pushQuery = new Parse.Query(Parse.Installation);
    //query.equalTo('channels', game.id);
    Parse.Push.send({
      where: pushQuery,
      data: {
        action: "eu.captag.game",
        alert: "The game start - NOW! Good luck!",
        name: "GAME START"
      }
    }, {
      success: function() {
        // Push was successful
        return;
      },
      error: function(error) {
        // Handle error
        status.error(error);
      }
    });

  }).then(function() {
    // Set the job's success status
    status.success("Start games completed successfully.");
  }, function(error) {
    // Set the job's error status
    status.error("Start games Uh oh, something went wrong.");
  });
});

Parse.Cloud.job("oneHourPush", function(request, status) {
  // Set up to modify user data
  Parse.Cloud.useMasterKey();

  // Send to all users where game starts now
  var GameObject = Parse.Object.extend("Game");
  var query = new Parse.Query(GameObject);
  var oneHourAfter = new Date();
  oneHourAfter.setTime(new Date().getTime() + 60 * 60 * 1000);
  query.greaterThan('startAt', oneHourAfter);
  query.equalTo('status', 'new');
  query.each(function(game) {
    // Set game as informed
    game.set("status", "informed");
    game.save();
    // Set and save the change
    var pushQuery = new Parse.Query(Parse.Installation);
    //query.equalTo('channels', game.id);
    Parse.Push.send({
      where: pushQuery,
      data: {
        alert: "The game starts soon! Prepare!",
        name: "GAME PREPARE"
      }
    }, {
      success: function() {
        // Push was successful
        return;
      },
      error: function(error) {
        // Handle error
        status.error(error);
      }
    });
  }).then(function() {
    // Set the job's success status
    status.success("One-Hour-Push completed successfully.");
  }, function(error) {
    // Set the job's error status
    status.error("One-Hour-Push Uh oh, something went wrong.");
  });
});
