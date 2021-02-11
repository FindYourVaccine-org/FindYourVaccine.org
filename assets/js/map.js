var map;

mapboxgl.accessToken = MAPBOX_TOKEN;

var transformRequest = (url, resourceType) => {
  var isMapboxRequest =
    url.slice(8, 22) === "api.mapbox.com" ||
    url.slice(10, 26) === "tiles.mapbox.com";
  return {
    url: isMapboxRequest ? url.replace("?", "?pluginName=sheetMapper&") : url,
  };
};

var filters = document.getElementById("filters");

$(document).ready(function () {
  fetchSheet();
});

function fetchSheet() {
  $.ajax({
    type: "GET",
    url: `https://docs.google.com/spreadsheets/d/${GSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${GSHEET_NAME}`,
    dataType: "text",
    success: function (csvData) {
      if (csvData.length > 0) {
        makeMap(csvData);
      } else {
        setTimeout(function () {
          fetchSheet();
        }, 2000);
      }
    },
  });
}

function makeMap(csvData) {
  var clickedStateId = null;

  map = new mapboxgl.Map({
    container: "map", // container id
    style: "mapbox://styles/mapbox/light-v10", // stylesheet location
    center: [parseFloat(CENTER_LON), parseFloat(CENTER_LAT)], // starting position
    zoom: 4, // starting zoom
    transformRequest: transformRequest,
  });

  csv2geojson.csv2geojson(
    csvData,
    {
      latfield: "Lat",
      lonfield: "Lon",
      delimiter: ",",
    },
    function (err, data) {
      map.on("load", function () {
        $("#filters").show();

        data.features.forEach(function(pin) {
          var el = document.createElement('span');
          switch(pin.properties['Status']) {
            case "No vaccine available":
              el.className = "pin status-no"; el.style.background = "#d7191c"; break;
            case "Have vaccine, no appointments":
              el.className = "pin status-no-appt"; el.style.background = "#fdae61"; break;
            case "Available for eligible":
              el.className = "pin status-available"; el.style.background = "#1a9641"; break;
            default:
              el.className = "pin status-unknown"; el.style.background = "#4a9ecf";
          };

          new mapboxgl.Marker(el)
            .setRotation(-45)
            .setLngLat(pin.geometry.coordinates)
            .setPopup(new mapboxgl.Popup().setHTML(pin.properties['Name']))
            .addTo(map);
        });

        var bbox = turf.bbox(data);
        map.fitBounds(bbox, { padding: 50 });

        // Tie filter toggles to data
        for (const name of ['available', 'no-appt', 'no', 'unknown']) {
          $(`#status-${name}`).on('change', function() {
            $(`.status-${name}`).toggle();
          });
        }

        var geocoder = new MapboxGeocoder({
          accessToken: mapboxgl.accessToken,
          mapboxgl: mapboxgl,
        });
        geocoder.setCountries("us");
        geocoder.setProximity({
          latitude: CENTER_LAT,
          longitude: CENTER_LON,
        });
        map.addControl(geocoder);
      });
    }
  );
}

function intersectRect(r1, r2) {
  return !(r2.left > r1.right ||
    r2.right < r1.left ||
    r2.top > r1.bottom ||
    r2.bottom < r1.top);
}

function getVisiblePins() {
  var cc = map.getContainer();
  var els = cc.getElementsByClassName('pin');
  var ccRect = cc.getBoundingClientRect();
  var visibles = [];
  for (var i=0; i < els.length; i++) {
    var el = els.item(i);
    var elRect = el.getBoundingClientRect();
    intersectRect(ccRect, elRect) && visibles.push(el);
  }
  return visibles;
}