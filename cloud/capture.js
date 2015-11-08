function checkWinner(gameId, callback) {
  var query = new Parse.Query(Tag);
  query.find({
    success: function(tags) {
      var teamsScore = _.groupBy(tags, 'team');
      for (var key in teamsScore) {
        if (teamsScore[key].length > tags.length / 2) {
          return callback(null, teamsScore[key]);
        }
      }
      callback(null, null, null);
    },
    error: function(err) {
      callback(err, null, null);
    }
  });
}

function calculateDomination(tagId, teamId, userId, callback) {
  console.log('START: calculateDomination');
  var queryTag = new Parse.Query(Tag);
  var queryTeam = new Parse.Query(Team);
  var queryPlayer = new Parse.Query(Player);
  // query.equalTo('id', tagId);
  async.parallel({
    tag: function(cb) {
      queryTag.get(tagId, function(result) {
        cb(null, result)
      });
    },
    team: function() {
      queryTeam.get(teamId, function(result) {
        cb(null, result)
      });
    },
    player: function() {
      queryPlayer.get(playerId, function(result) {
        cb(null, result)
      });
    },
  }, function(err, results) {
    var tag = results.tag;
    var team = results.team;
    var player = results.player;

    if (!tag) return callback(null, null);

    // Do something with the returned Parse.Object values
    if (tag) console.log('Found tag: ' + tag.id);
    if (team) console.log('Found tag: ' + tag.id);
    if (player) console.log('Found tag: ' + tag.id);

    var playerRelation = tag.relation("player");
    var teamRelation = tag.relation("team");
    async.parallel({
      tagPlayers: function(cb) {
        playerRelation.query().find({
          success: function(players) {
            // list contains the posts that the current user likes.
            cb(null, players);
          }
        });
      },
      tagTeams: function(cb) {
        teamRelation.query().find({
          success: function(teams) {
            // list contains the posts that the current user likes.
            cb(null, teams);
          }
        });
      },
    }, function(err, results) {

      var tagPlayers = results.tagPlayers;
      var tagTeams = results.tagTeams;

      // Tag is not captured yet
      if ((!tagPlayers || tagPlayers.length === 0) && (!tagTeams || tagTeams.length === 0)) {
        playerRelation.add(player);
        teamRelation.add(team);
        return tag.save(null, callback);
      }

      // Tag already captured by same team
      if (tagTeams[0].id === team.id) {
        return callback(null, true);
      }

      // Check the majority for capturing
      var queryNotTeam = new Parse.Query(Player);
      queryNotTeam.withinKilometers("geoPoint", tag.geoPoint, 0.05);
      queryNotTeam.notEqualTo("team", team.id);

      queryNotTeam.count().then(
        function(count) {
          console.log('pura vide', count);
          if (!count) {
            console.log('no change');
            return callback(null, 'no change');
          }

          var queryTeamMembers = new Parse.Query(Player);
          queryTeamMembers.withinKilometers("location", tagLocation, 0.05);
          queryTeamMembers.equalTo("teamId", teamId);

          queryTeamMembers.count({
            success: function(countTeam) {
              if (count === countTeam) {
                result.set("player", null);
                result.set("team", null);
              }
              if (count < countTeam) {
                var queryTeam = new Parse.Query(Team);
                queryTeam.get(teamId, function(err, data) {
                  result.set("player", userId);
                  result.set("team", data);
                  return result.save(null, callback);
                });
              }
              return result.save(callback);
            }
          });
        });
    });
  });
}

Parse.Cloud.define("capture", function capture(req, resp) {
  var attr = JSON.parse(req.body);
  calculateDomination(attr.tagId, attr.teamId, attr.playerId, function(err, data) {
    console.log('Finish calculate domination');
    console.log('Error: ', err);
    console.log('Data: ', data);
    if (err || !data)
      return resp.error("Tag/Team/User Error");
    checkWinner(req.body.gameId, function(err, winnerTeam) {
      if (winnerTeam) return resp.success({
        winner: winnerTeam
      });
      return resp.success(data);
    });
  });
});
