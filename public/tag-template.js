var map;

var tagsTable;
var tableData = {};

function deleteTag(event) {
  $('.alert').addClass('hidden');

  var data = tagsTable.row($(event.target).parents('tr')).data();
  for (var i = 0; i < tableData.length; i++) {
    if (tableData[i] && tableData[i].id === data.id) {
      var object = tableData[i];
      delete tableData[i];
      object.destroy({
        success: function(myObject) {
          // The object was deleted from the Parse Cloud.
          $('.alert-success').html('Deleted tag!').removeClass('hidden');
          tagsTable.row($(event.target).parents('tr')).remove().draw();
        },
        error: function(myObject, error) {
          // The delete failed.
          // error is a Parse.Error with an error code and message.
          console.log('Delete error: ' + error);
        }
      });
    }
  }
}

function initTable(reinitTable) {

  var query = new Parse.Query(TagTemplateObject);
  query.find({
    success: function(results) {

      console.log("Successfully retrieved " + results.length + " scores.");
      tableData = results;

      // Do something with the returned Parse.Object values
      for (var i = 0; i < results.length; i++) {
        var object = results[i];
        object.id = object.id;
        object.label = object.get('label');
        object.geoPoint = "LAT:   " + object.get('geoPoint').latitude + "<br/>";
        object.geoPoint += "LONG: " + object.get('geoPoint').longitude;
        object.createDate = moment(object.createAt).format('DD.MM.YYYY');
        results[i] = object;
      }

      if (reinitTable === true) {
        tagsTable.clear().addData(results);
      } else {

        tagsTable = $('#tags-table').DataTable({
          data: results,
          columns: [{
            data: "id",
            visible: false,
            searchable: false
          }, {
            title: "Label",
            data: "label"
          }, {
            title: "Geo Point",
            data: "geoPoint"
          }, {
            title: "Create Date",
            data: "createDate"
          }, {
            title: "Actions",
            data: null,
            defaultContent: '<button type="button" onClick="deleteTag(event)" class="btn btn-danger"><span class="glyphicon glyphicon-minus" aria-hidden="true"></span></button>'
          }],
          paging: false,
        });
      }
    },
    error: function(error) {
      alert("Error: " + error.code + " " + error.message);
    }
  });
}

// Assing click listeners
var setCurrentMarker = function(event) {
  if (event) {
    var latitude = event.latLng.lat();
    var longitude = event.latLng.lng();
    $('#new-tag input[name="label"]').val(this.title);
    $('#new-tag input[name="latitude"]').val(latitude);
    $('#new-tag input[name="longitude"]').val(longitude);
    console.log('Selected point:' + latitude + ', ' + longitude);
  }
}

function initAutocomplete() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {
      lat: 48.7775525,
      lng: 9.15593130
    },
    zoom: 15,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  // Create the search box and link it to the UI element.
  var input = document.getElementById('pac-input');
  var searchBox = new google.maps.places.SearchBox(input);
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

  // Bias the SearchBox results towards current map's viewport.
  map.addListener('bounds_changed', function() {
    searchBox.setBounds(map.getBounds());
  });

  var markers = [];
  // [START region_getplaces]
  // Listen for the event fired when the user selects a prediction and retrieve
  // more details for that place.
  searchBox.addListener('places_changed', function() {
    var places = searchBox.getPlaces();

    if (places.length == 0) {
      return;
    }

    // Clear out the old markers.
    markers.forEach(function(marker) {
      marker.setMap(null);
    });
    markers = [];

    // For each place, get the icon, name and location.
    var bounds = new google.maps.LatLngBounds();
    places.forEach(function(place) {
      var icon = {
        url: place.icon,
        size: new google.maps.Size(71, 71),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(17, 34),
        scaledSize: new google.maps.Size(25, 25)
      };

      // Create a marker for each place.
      markers.push(new google.maps.Marker({
        map: map,
        icon: icon,
        title: place.name,
        position: place.geometry.location
      }));

      if (place.geometry.viewport) {
        // Only geocodes have viewport.
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }

      console.log('New location:' + place.geometry.location);

    });

    markers.forEach(function(marker) {
      google.maps.event.addListener(marker, "click", setCurrentMarker);
    });

    map.fitBounds(bounds);
  });
  // [END region_getplaces]

  google.maps.event.addListener(map, "click", setCurrentMarker);
}
/****** END MAP ******/

$(document).ready(function() {


  $('#new-tag').submit(function(event) {
    $('.alert').addClass('hidden');

    event.preventDefault(); // avoid to execute the actual submit of the form.

    var formData = {};
    $(this).serializeArray().map(function(x) {
      formData[x.name] = x.value;
    });

    if (formData.label.length === 0) {
      $('.alert-danger').html('Please type in the label!').removeClass('hidden');
      return;
    }

    try {
      var tagTemplate = new TagTemplateObject();
      tagTemplate.save({
        label: formData.label,
        geoPoint: new Parse.GeoPoint({
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude)
        })
      }, {
        success: function(object) {
          object.id = object.id;
          object.label = object.get('label');
          object.geoPoint = "LAT:   " + object.get('geoPoint').latitude + "<br/>";
          object.geoPoint += "LONG: " + object.get('geoPoint').longitude;
          object.createDate = moment(object.createAt).format('DD.MM.YYYY');
          tagsTable.row.add(object).draw();
          tableData.push(object);
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
  });

  initTable(false);

});
