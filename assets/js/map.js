var map;

mapboxgl.accessToken = MAPBOX_TOKEN;

var transformRequest = (url, resourceType) => {
  var isMapboxRequest =
    url.slice(8, 22) === "api.mapbox.com" ||
    url.slice(10, 26) === "tiles.mapbox.com";
  return {
    url: isMapboxRequest
      ? url.replace("?", "?pluginName=sheetMapper&")
      : url
  };
};

var colors = [
  'match',
  ['get', 'Status'],
  'No vaccine available',
  '#b0611a',
  'Have vaccine, no appointments',
  '#dfc27d',
  'Available for eligible',
  '#019071',
  /* other */ '#666'
];

var filters = document.getElementById('filters');

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
        setTimeout(function() { fetchSheet(); }, 2000);
      }
    }
  });
}

function makeMap(csvData) {
  var clickedStateId = null;

  map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/mapbox/light-v10', // stylesheet location
    center: [parseFloat(CENTER_LON), parseFloat(CENTER_LAT) ], // starting position
    zoom: 4, // starting zoom
    transformRequest: transformRequest
  });

  csv2geojson.csv2geojson(csvData, {
    latfield: 'Lat',
    lonfield: 'Lon',
    delimiter: ','
  }, function (err, data) {
    map.on('load', function () {
      // Add the data source for later reference
      map.addSource('data', {
        'type': 'geojson',
        'data': data,
        'generateId': true // This ensures that all features have unique IDs
      });

      // Add the data layer to the map
      map.addLayer({
        'id': 'csvData',
        'type': 'circle',
        'source': 'data',
        'paint': {
          'circle-radius': 5,
          'circle-color': colors
        }
      });

      // add click 'target' layer
      map.addLayer({
        'id': 'clickData',
        'type': 'circle',
        'source': 'data',
        'layout': {},
        'paint': {
          'circle-radius': 7,
          'circle-opacity': 0,
          'circle-stroke-color': '#000',
          'circle-stroke-width': 3,
          'circle-stroke-opacity': [
            'case',
            ['boolean', ['feature-state', 'clicked'], false],
              1, 0
          ]
        }
      });

      // When a click event occurs on a feature in the csvData layer, open a popup with description HTML from its properties.
      map.on('click', 'csvData', function (e) {
        // Show click layer for single marker when clicked
        if (e.features.length > 0) {
          if (clickedStateId) {
            map.setFeatureState(
              { source: 'data',
                id: clickedStateId },
              { clicked: false }
            );
          }
          clickedStateId = e.features[0].id;
          map.setFeatureState(
            { source: 'data',
              id: clickedStateId },
            { clicked: true }
          );
        }

        var coordinates = e.features[0].geometry.coordinates.slice();

        // set popup text
        var ps = e.features[0].properties;

        var description = `<h3>${ps.Name}</h3>`;

        if (ps.Summary) {
          description += `<small>Last updated: ${ps['Last Contacted']}</small>${converter.makeHtml(ps.Summary)}`;
        }

        description += `<h4><b>Address: </b>${ps.Address}</h4>`;

        if (ps.Website) {
          description += `<h4><b>Website: </b>${link(ps.Website)}</h4>`;
        }

        if (ps.Email) {
          description += `<h4><b>Email: </b><a href="mailto:${ps.Email}">${ps.Email}</a></h4>`;
        }

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        // add popup to map
        var popup = new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(description)
          .addTo(map);
      });

      map.on('mouseenter', 'csvData', function () {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'csvData', function () {
        map.getCanvas().style.cursor = '';
      });

      var bbox = turf.bbox(data);
      map.fitBounds(bbox, { padding: 50 });

      // add status filters
      var typesObj = {}, types = [];
      for (var i = 0; i < data.features.length; i++) {
        typesObj[data.features[i].properties['Status']] = true;
      }
      for (var k in typesObj) { types.push(k) };
      types.sort();

      var checkboxes = [];
      // Create a filter interface.
      for (var i=0; i < types.length; i++) {
        // Create an an input checkbox and label inside.
        var item = filters.appendChild(document.createElement('div'));
        var checkbox = item.appendChild(document.createElement('input'));
        var label = item.appendChild(document.createElement('label'));
        label.className = "filter-label";
        checkbox.type = 'checkbox';
        checkbox.id = types[i];
        checkbox.checked = true;
        // create a label to the right of the checkbox with explanatory text
        label.innerHTML = types[i];
        label.setAttribute('for', types[i]);
        // Whenever a person clicks on this checkbox, call the update().
        checkbox.addEventListener('change', update);
        checkboxes.push(checkbox);
      }

      // Call when someone clicks on a checkbox and changes the selection of markers to be displayed
      function update() {
        var enabled = {};
        for (var i=0; i < checkboxes.length; i++) {
          if (checkboxes[i].checked) enabled[checkboxes[i].id] = true;
        }
        enabledArr = Object.keys(enabled);
        enabledArr.push('x'); // filter expects at least one value

        var clickFilter = [
          'match',
          ['get', 'Status'],
          enabledArr,
          true,
          false
        ];
        map.setFilter('csvData', clickFilter);
        map.setFilter('clickData', clickFilter);
      }

      var geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl
      })
      geocoder.setCountries("us");
      geocoder.setProximity({
        latitude: CENTER_LAT,
        longitude: CENTER_LON
      });
      map.addControl(geocoder);

    });
  });
}