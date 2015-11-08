var viewTable;
var tableModels = {};

var tagsData = [];
var tagsArray = [];

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
    if (x.name === 'tags' && !(formData[x.name] instanceof Array))
      formData[x.name] = [];

    if (formData[x.name] instanceof Array) {
      formData[x.name].push(x.value);
    } else if (formData[x.name]) {
      var tmp = formData[x.name];
      formData[x.name] = [];
      formData[x.name].push(tmp);
      formData[x.name].push(x.value);
    } else {
      formData[x.name] = x.value;
    }
  });

  if (formData.name.length === 0 || formData.tags === undefined || formData.tags.length === 0) {
    $('.alert-danger').html('Please type in the name and tags!').removeClass('hidden');
    return;
  }

  try {
    var gameTemplate = new GameTemplateObject();
    var relation = gameTemplate.relation("tagTemplates");
    var relationObjects = [];
    _.each(formData.tags, function(element, index, list) {
      var tagRelObj = _.find(tagsData, function(tagObject) {
        return element === tagObject.id;
      });
      if (tagRelObj)
        relationObjects.push(tagRelObj);
    });
    relation.add(relationObjects);

    gameTemplate.save({
      name: formData.name,
    }, {
      success: function(object) {
        tableModels.push(object);

        var tableModel = {};
        tableModel.id = object.id;
        tableModel.name = object.get('name');
        tableModel.tagTemplates = relationObjects;
        tableModel.tagTemplatesString = [];
        tableModel.tagTemplates.forEach(function(tag) {
          tableModel.tagTemplatesString.push(tag.get('label'));
        });
        tableModel.tagTemplatesString = tableModel.tagTemplatesString.join('<br/>');
        tableModel.createDate = moment(tableModel.createAt).format('DD.MM.YYYY');
        viewTable.row.add(tableModel).draw();

        $('.alert-success').html('Created tag!').removeClass('hidden');
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

function initFormTags() {
  var query = new Parse.Query(TagTemplateObject);
  query.find({
    success: function(results) {
      console.log("Successfully retrieved " + results.length + " tags.");
      // Do something with the returned Parse.Object values
      for (var i = 0; i < results.length; i++) {
        tagsData.push(results[i]);
        tagsArray.push({
          id: results[i].id,
          text: results[i].get('label')
        });
      }
      $("#tags-select2").select2({
        data: tagsArray,
        multiple: true
      });
    },
    error: function(error) {
      alert("Error: " + error.code + " " + error.message);
    }
  });
}

function initTable() {

  var query = new Parse.Query(GameTemplateObject);
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
        object.createDate = moment(object.createAt).format('DD.MM.YYYY');

        var relation = object.relation("tagTemplates");
        var query = relation.query();
        query.find({
          success: function(results) {
            object.tagTemplates = [];
            if (results) {
              results.forEach(function(tag) {
                object.tagTemplates.push(tag.get('label'));
              });
            }
            object.tagTemplatesString = object.tagTemplates.join('<br/>');
            tableData.push(object);
            callback();
          }
        });
      }, function done() {
        viewTable = $('#viewTable').DataTable({
          data: tableData,
          columns: [{
            data: "id",
            visible: false,
            searchable: false
          }, {
            title: "Name",
            data: "name"
          }, {
            title: "Tag Templates",
            data: "tagTemplatesString"
          }, {
            title: "Create Date",
            data: "createDate"
          }, {
            title: "Actions",
            data: null,
            defaultContent: '<button type="button" onClick="_delete(event)" class="btn btn-danger"><span class="glyphicon glyphicon-minus" aria-hidden="true"></span></button>'
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
  initFormTags();

  $('#new-tag').submit(_create);

});
