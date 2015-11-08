var viewTable;
var tableModels = {};

var templatesData = [];
var templatesArray = [];

function _print(event) {
  var data = viewTable.row($(event.target).parents('tr')).data();
  window.open('/print-codes.html?game=' + data.id);
}

function _preview(event) {
  var data = viewTable.row($(event.target).parents('tr')).data();
  window.open('/match.html?game=' + data.id);
}

function _delete(event) {
  $('.alert').addClass('hidden');

  var data = viewTable.row($(event.target).parents('tr')).data();
  _.each(tableModels, function(element, index, list) {
    if (element && element.id === data.id) {
      return element.destroy({
        success: function(myObject) {
          // The object was deleted from the Parse Cloud.
          $('.alert-success').html('Deleted tag!').removeClass('hidden');

          delete list[index];
          viewTable.row($(event.target).parents('tr')).remove().draw();
        },
        error: function(myObject, error) {
          // The delete failed.
          // error is a Parse.Error with an error code and message.
          console.log('Delete error: ' + error);
        }
      });
    }
  });
}

function _create(event) {
  $('.alert').addClass('hidden');
  event.preventDefault(); // avoid to execute the actual submit of the form.

  var formData = {};
  $(this).serializeArray().map(function(x) {
    formData[x.name] = x.value;
  });

  try {
    var game = new GameObject();
    var currentGameTemplate = null;
    _.each(templatesData, function(element, index, list) {
      if (element.id === formData.gameTemplate)
        currentGameTemplate = element;
    });

    game.save({
      name: formData.name,
      icon: formData.icon,
      status: "new",
      startAt: moment(formData.start, "DD.MM.YYYY hh:mm").toDate(),
      gameTemplate: currentGameTemplate
    }, {
      success: function(object) {
        var currentGame = object;
        // Add to the table
        tableModels.push(object);
        var tableModel = {};
        tableModel.id = object.id;
        tableModel.name = object.get('name');
        if(object.get('icon'))
          object.icon = '<div class="thumbnail"><img class="game-icon" src="' + object.get('icon') + '"/></div>';
        else
          object.icon = null;
        tableModel.gameTemplate = currentGameTemplate.get('name');
        tableModel.createDate = moment(tableModel.createAt).format('DD.MM.YYYY');
        viewTable.row.add(tableModel).draw();

        async.parallel([
            function(callback) {
              // Generate teams for the game
              var teams = [];
              var takenValues = [];
              for (var i = 0; i < formData.teamsQuantity; i++) {
                var team = new TeamObject();
                var name = chance.province({
                  full: true
                });
                var color = chance.color({
                  format: 'hex',
                  casing: 'upper'
                });
                while (_.indexOf(takenValues, name) !== -1)
                  name = chance.province({
                    full: true
                  });
                while (_.indexOf(takenValues, color) !== -1)
                  color = chance.color({
                    casing: 'upper'
                  });
                takenValues.push(name);
                takenValues.push(color);
                team.set('name', name);
                team.set('color', color);
                team.set('maxTeamMembers', formData.maxTeamMembers);
                team.set('game', currentGame);
                teams.push(team);
              }
              // save all the newly created objects
              Parse.Object.saveAll(teams, {
                success: function(objs) {
                  console.log('Teams created: ', objs.length);
                  callback(null, objs);
                },
                error: function(error) {
                  callback(error);
                }
              });
            },
            function(callback) {
              // Generate tags for the game
              var tagTemplatesRelation = currentGameTemplate.relation("tagTemplates");
              tagTemplatesRelation.query().find({
                success: function(tagTemplates) {
                  var tags = [];
                  tagTemplates.forEach(function(tagTemplate) {
                    var tag = new TagObject();
                    console.log(tagTemplate.get("geoPoint"));
                    tag.set('label', tagTemplate.get("label"));
                    tag.set('geoPoint', tagTemplate.get("geoPoint"));
                    tag.set('game', currentGame);
                    tags.push(tag);
                  });
                  Parse.Object.saveAll(tags, {
                    success: function(objs) {
                      console.log('Tags created: ', objs.length);
                      callback(null, objs);
                    },
                    error: function(error) {
                      callback(error);
                    }
                  });
                }
              });
            },
          ],
          // optional callback
          function(err, results) {
            if (err) {
              currentGame.destroy();
              $('.alert-danger').html('Error happened!').removeClass('hidden');
            } else {
              $('.alert-success').html('Created tag!').removeClass('hidden');
            }
          });
      },
      error: function(model, error) {
        console.log(error);
        console.log(model);
        $('.alert-danger').html(error).removeClass('hidden');
      }
    });
  } catch (e) {
    console.log(e);
    $('.alert-danger').html(e).removeClass('hidden');
  }
}

function initFormGameTemplates() {
  var query = new Parse.Query(GameTemplateObject);
  query.find({
    success: function(results) {
      console.log("Successfully retrieved " + results.length + " tags.");
      // Do something with the returned Parse.Object values
      for (var i = 0; i < results.length; i++) {
        templatesData.push(results[i]);
        var icon;
        if(results[i].get('icon'))
          icon = '<div class="thumbnail"><img class="game-icon" src="' + results[i].get('icon') + '"/></div>';
        else
          icon = null;
        templatesArray.push({
          id: results[i].id,
          text: results[i].get('name'),
          icon: icon
        });
      }
      $("#gameTemplate-select2").select2({
        data: templatesArray,
        multiple: false
      });
    },
    error: function(error) {
      alert("Error: " + error.code + " " + error.message);
    }
  });
}

function initTable() {

  var query = new Parse.Query(GameObject);
  query.find({
    success: function(results) {

      console.log("Successfully retrieved " + results.length + " game templates.");
      tableModels = results;

      // Do something with the returned Parse.Object values
      var tableData = [];
      async.eachSeries(results, function iterator(item, callback) {
        var object = item;
        object.id = object.id;
        object.name = object.get('name');
        if(object.get('icon'))
          object.icon = '<div class="thumbnail"><img class="game-icon" src="' + object.get('icon') + '"/></div>';
        else
          object.icon = null;
        object.createDate = moment(object.createAt).format('DD.MM.YYYY');

        var relation = object.relation("tags");
        var query = relation.query();
        query.find({
          success: function(results) {
            object.tagTemplates = [];
            results.forEach(function(tag) {
              var captured = '<span class="glyphicon glyphicon-map-marker" aria-hidden="true" style="color:red"></span> ';
              if (tag.captured === false)
                captured = '<span class="glyphicon glyphicon-map-marker" aria-hidden="true" style="color:green"></span> ';
              object.tagTemplates.push(captured + tag.get('label'));
              object.tagTemplatesString = object.tagTemplates.join('<br/>');
            });
            tableData.push(object);
            callback();
          }
        });
      }, function done() {
        viewTable = $('#viewTable').DataTable({
          data: tableData,
          columns: [{
            title: "Icon",
            data: "icon"
          }, {
            data: "id",
            visible: false,
            searchable: false
          }, {
            title: "Name",
            data: "name"
          }, {
            title: "Create Date",
            data: "createDate"
          }, {
            title: "Actions",
            data: null,
            defaultContent: '<button type="button" onClick="_delete(event)" class="btn btn-danger"><span class="glyphicon glyphicon-minus" aria-hidden="true"></span></button>' +
              ' | <button type="button" onClick="_print(event)" class="btn btn-primary"><span class="glyphicon glyphicon-print" aria-hidden="true"></span></button>' +
              ' | <button type="button" onClick="_preview(event)" class="btn btn-success"><span class="glyphicon glyphicon-map-marker" aria-hidden="true"></span></button>'
          }],
          paging: false,
        });
      });
    },
    error: function(error) {
      alert("Error: " + error.code + " " + error.message);
    }
  });
}

$(document).ready(function() {

  initTable();
  initFormGameTemplates();

  $('#new-tag').submit(_create);
  $('#startPicker').val(moment().format('DD.MM.YYYY hh:mm'));
  $('#startPicker').datetimepicker({
    format: 'd.m.Y H:i'
  });

});
