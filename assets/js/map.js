var map;

mapboxgl.accessToken = MAPBOX_TOKEN;

var transformRequest = (url, resourceType) => {
  var isMapboxRequest =
    url.slice(8, 22) === "api.mapbox.com" || url.slice(10, 26) === "tiles.mapbox.com";
  return {
    url: isMapboxRequest ? url.replace("?", "?pluginName=sheetMapper&") : url,
  };
};

var filters = document.getElementById("filters");

$(document).ready(function () {
  fetchSheet();

  $("#mobile-filters-holder").toggle();

  // If needed, switch to mobile view on initial load
  var width = (window.innerWidth > 0) ? window.innerWidth : screen.width;
  if (width <= 990) {
    $("#wide-map-holder").hide();
    var filtersToMove = $("#filters").detach();
    $("#mobile-filters-holder").append(filtersToMove);
    var mapToMove = $("#map-and-filters").detach();
    $("#mobile-map-holder").append(mapToMove);
  }

  // Move map above cards for smaller widths on resizing
  $(window).resize(function() {
    var width = (window.innerWidth > 0) ? window.innerWidth : screen.width;
    if (width <= 990 && $("#wide-map-holder").is(":visible")) {
      // Resize to smaller screen
      $("#wide-map-holder").hide();
      var filtersToMove = $("#filters").detach();
      $("#mobile-filters-holder").append(filtersToMove);
      var mapToMove = $("#map-and-filters").detach();
      $("#mobile-map-holder").append(mapToMove);
      $("#mobile-map-holder").show();
      $("#mobile-filters-holder").show();
      map.resize();
      $("#map-toggle").text("Hide map");
    } else if (width > 990) {
      // Resize to larger screen
      $("#mobile-map-holder").hide();
      $("#mobile-filters-holder").hide();
      var filtersToMove = $("#filters").detach();
      $("#map-filter-holder").append(filtersToMove);
      var mapToMove = $("#map-and-filters").detach();
      $("#wide-map-holder").append(mapToMove);
      $("#wide-map-holder").show();
      map.resize();
    }
  });

  // Show map on mobile toggle
  $("#map-toggle").on("click", function(e) {
    toggleMobileMap(e);
  });
});

function toggleMobileMap(e) {
  $(e.target).text(($(e.target).text() == 'Show map') ? 'Hide map' : 'Show map');
  $("#mobile-map-holder").toggle();
  $("#mobile-filters-holder").toggle();
  e.preventDefault();
  map.resize();
}

function fetchSheet() {
  $.ajax({
    type: "GET",
    url: `https://docs.google.com/spreadsheets/d/${GSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${GSHEET_NAME}`,
    dataType: "text",
    success: function (csvData) {
      if (csvData.length > 0) {
        makeMap(csvData);
        makeCards(csvData);
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
    center: [CENTER_LON, CENTER_LAT], // starting position
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
        $("#providers-container").show();
        map.resize();

        data.features.forEach(function(pin) {
          var el = document.createElement('span');
          el.id = pin.properties['ID'];
          switch(pin.properties['Status']) {
            case "No vaccine available":
              el.className = "pin status-no"; el.style.background = "#d7191c"; break;
            case "Have vaccine, no appointments":
              el.className = "pin status-no-appt"; el.style.background = "#fdae61"; break;
            case "Available for eligible":
              el.className = "pin status-available"; el.style.background = "#1a9641"; break;
            default:
              el.className = "pin status-unknown"; el.style.background = "#333333";
          };

          new mapboxgl.Marker(el)
            .setRotation(-45)
            .setLngLat(pin.geometry.coordinates)
            .addTo(map);
        });

        $('.pin').click(function() {
          const cardId = '#card-' + $(this).attr('id');
          var offset = $(`#provider-cards ${cardId}`)[0].offsetTop - $("#provider-cards")[0].offsetTop - 3;
          $("#provider-cards").animate({scrollTop: offset}, 500, 'swing');
          $('.location-card').removeClass('highlight-card');
          $(cardId).addClass('highlight-card');
        });

        var bbox = turf.bbox(data);
        map.fitBounds(bbox, { padding: 50 });

        // Tie filter toggles to data
        for (const name of ['available', 'no-appt', 'no', 'unknown']) {
          $(`#status-${name}`).on('change', function() {
            $(`.status-${name}`).toggle();
            updateVisible();
          });
        }

        map.on('moveend', function() { updateVisible(); });

        var geocoder = new MapboxGeocoder({
          accessToken: mapboxgl.accessToken,
          mapboxgl: mapboxgl,
        });
        geocoder.setCountries("us");
        geocoder.setProximity({
          latitude: CENTER_LAT,
          longitude: CENTER_LON,
        });
        geocoder.setBbox([MIN_X, MIN_Y, MAX_X, MAX_Y]);
        $('#map-search').append(geocoder.onAdd(map));
        geocoder.setPlaceholder("Search by address, zip, or location");
        map.resize();
      });
    }
  );
}

function makeCards(csvData) {
  var rows = Papa.parse(csvData).data;
  var keys = rows[0];
  data = [];
  for (i = 1; i < rows.length; i++) {
    var entry = {};
    for (j = 0; j < rows[i].length; j++) {
      entry[keys[j]] = rows[i][j];
    }
    data.push(Object.assign({}, entry));
  }

  const statusSort = {
    "Available for eligible": 0,
    "Have vaccine, no appointments": 1,
    "No vaccine available": 2,
    "Unknown": 3
  };
  data.sort(function(a, b) {
    if (a.Status === b.Status) {
      return new Date(b['Last call timestamp']) - new Date(a['Last call timestamp']);
    }
    return statusSort[a.Status] > statusSort[b.Status] ? 1 : -1;
  });

  var cardsHtml = data.map((cardData) => {
    let statusClass = "card-unknown";
    let statusText = "No data on location";
    switch(cardData['Status']) {
      case "No vaccine available":
        statusClass = "card-no";
        statusText = "Vaccine unavailable"; break;
      case "Have vaccine, no appointments":
        statusClass = "card-no-appt";
        statusText = "Not scheduling appointments"; break;
      case "Available for eligible":
        statusClass = "card-available";
        statusText = "Vaccine available for eligible";
    };

    let cardDetails = "";
    if (cardData["Last restrictions"]) {
      cardDetails += `<div><strong>Restrictions:</strong> ${cardData["Last restrictions"]}</div>`;
    }
    if (cardData["Last groups served"]) {
      cardDetails += `<div><strong>Eligibility:</strong> ${cardData["Last groups served"]}</div>`;
    }
    if (cardData["Last appointment instructions"]) {
      cardDetails += `<div><strong>Appointment instructions:</strong> ${cardData["Last appointment instructions"]}</div>`;
    }
    if (cardData["Last external notes"]) {
      cardDetails += `<div><strong>Notes:</strong> ${cardData["Last external notes"]}</div>`;
    }
    if (cardDetails.length > 0) {
      cardDetails = `<div class="card__footer">${cardDetails}</div>`;
    }

    return `
<div class="location-card" id="card-${cardData.ID}">
  <header class="card__header">
    <h1 class="card__title">${cardData.Name}</h1>
    <div class="card__addr">
      <span>${cardData.Address} <a target="_blank" href="https://www.google.com/maps/dir//${cardData.Name}, ${cardData.Address}"><i style="font-size:20px" class="material-icons">directions</i></a></span>
    </div>
  </header>
  <div class="card__middle row">
    <div class="col-sm-auto col-12">
      <div class="card__last-updated">Last updated: ${cardData["Last Contacted"]}</div>
      <div class="card__pill ${statusClass}">${statusText}</div>
    </div>
    <div class="col-sm-auto">${
      cardData["Website"] &&
      `<a target="_blank" href="${cardData["Website"]}" class="card__cta">
        Visit Website <i style="font-size:14px" class="material-icons">launch</i></a>
      `
    }
    </div>
  </div>
  ${cardDetails}
</div>
    `;
  });
  $("#provider-cards").html(cardsHtml);

  map.resize();
  updateVisible();

  $('.location-card').mouseenter(function() {
    const pinId = '#' + $(this).attr('id').replace('card-', '');
    $(pinId).addClass('highlight-pin');
  }).mouseleave(function() {
    const pinId = '#' + $(this).attr('id').replace('card-', '');
    $(pinId).removeClass('highlight-pin');
  });
}

function intersectRect(r1, r2) {
  return !(r2.left > r1.right ||
    r2.right < r1.left ||
    r2.top > r1.bottom ||
    r2.bottom < r1.top);
}

function updateVisible() {
  var cc = map.getContainer();
  var els = cc.getElementsByClassName('pin');
  var ccRect = cc.getBoundingClientRect();
  for (var i=0; i < els.length; i++) {
    var el = els.item(i);
    var elRect = el.getBoundingClientRect();
    if (intersectRect(ccRect, elRect)) {
      $(`#card-${el.id}`).show();
    } else {
      $(`#card-${el.id}`).hide();
    }
  }
}