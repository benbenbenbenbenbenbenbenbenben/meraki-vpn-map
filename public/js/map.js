var map
var locations = []
var curvature = 0.2 // how curvy to make the arc

//Based off:
//https://stackoverflow.com/questions/34131378/how-to-make-a-dashed-curved-polyline-in-google-maps-js-api

//Initialize Map on page load
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: -24.595260, lng: 128.974}, //Australia :)
        zoom: 4,
        styles: mapStyles, //load custom map styles from /js/map-styles.js
        mapTypeControl: false,
		zoomControl: true,
		panControl: false,
	        scaleControl: false,
	        streetViewControl: false,
	        scrollwheel: false
    });
    fetchMXs(loadMap) // function.js
}

//Load map and place MX Markers
function loadMap(mxList) {
    progress('Loading Map')
    console.log(mxList)
    var LatLngBounds = google.maps.LatLngBounds,
        infowindow = new google.maps.InfoWindow(),
        bounds = new LatLngBounds();
    //Check if MX is hub or spoke
    for (let i=0; i < mxList.length; i++) {
        if (mxList[i].mode !== 'none'){
            let location = [mxList[i].serial, mxList[i].lat, mxList[i].lng, mxList[i].mode, mxList[i].hubs, i]
            locations.push(location)
        } else {
            let location = [mxList[i].serial, mxList[i].lat, mxList[i].lng, mxList[i].mode, 'none', i]
            locations.push(location)
        }
    }
    console.log(locations)
    for (i = 0; i < locations.length; i++) {
            if(mxList[i].status === "online"){
                var image = 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' //Online Marker Image
            } else {
                var image = 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'   //Offline Marker Image
            }
            this["marker"+i] = new google.maps.Marker({
                position: new google.maps.LatLng(locations[i][1], locations[i][2]),
                draggable: false,
                map: map,
                icon: image,
            });

            bounds.extend(this["marker"+i].position);
            var mxName = ''
            if(!!mxList[i].name){
                mxName = mxList[i].name
            } else {
                mxName = mxList[i].serial
            }
            let contentString = mxInfoMarker(mxName, locations[i][3], mxList[i].subnets.active, mxList[i].subnets.length, mxList[i].model, mxList[i].serial, mxList[i].perfScore)

            google.maps.event.addListener(this["marker"+i], 'mouseover', (function (marker, i) {
                return function () {
                    infowindow.setContent(contentString)
                    infowindow.open(map, marker)
                }
            })(this["marker"+i], i))

            google.maps.event.addListener(this["marker"+i], 'position_changed', updateCurveMarker)
            google.maps.event.addListener(map, 'click', function() {
				infowindow.close()
			})
    }

    map.fitBounds(bounds)

    updateCurveMarker()
    
   google.maps.event.addListener(map, 'zoom_changed', updateCurveMarker)

   //Hide Loader and allow Button to be used
   document.getElementById('loadStatus').classList.add("hide-loader")
   document.getElementById('loader').classList.add("hide-loader")
   document.getElementById("checkerButton").disabled=false
}


function updateCurveMarker() {
    var tunnel = ""
    for (let i = 0; i < locations.length; i++) {
        if(locations[i][3] === 'spoke'){
            for (let j = 0; j < locations[i][4].length; j++){
                var resultObject = search(locations[i][4][j].hubId, mxList);
                var resultObject2 = search2(resultObject, locations);
                tunnel = i+'to'+resultObject2
                createCurve(i, resultObject2, tunnel)
            }
        } else if (locations[i][3] === 'hub'){
            for (let k = i+1; k < locations.length; k++)    {
                if (locations[k][3] === 'hub'){
                tunnel = i+'to'+k
                createCurve(i,k, tunnel)
                }
            }
        }
    }
}

function createCurve(mx1, mx2, tunnel, active){
    var Point = google.maps.Point,
        Marker = google.maps.Marker

    this["curveMarker"+tunnel];
    var pos1 = this["marker"+mx1].getPosition(), // latlng
        pos2 = this["marker"+mx2].getPosition(),
        projection = map.getProjection(),
        p1 = projection.fromLatLngToPoint(pos1), // xy
        p2 = projection.fromLatLngToPoint(pos2);

        //curvature *= Math.floor(Math.random()*2) == 1 ? 1 : -1; // this will add minus sign in 50% of cases
        var e = new Point(p2.x - p1.x, p2.y - p1.y), // endpoint (p2 relative to p1)
            m = new Point(e.x / 2, e.y / 2), // midpoint
            o = new Point(e.y, -e.x), // orthogonal
            c = new Point( // curve control point
                m.x + curvature * o.x,
                m.y + curvature * o.y);

        var pathDef = 'M 0,0 ' +
            'q ' + c.x + ',' + c.y + ' ' + e.x + ',' + e.y;

        var zoom = map.getZoom(),
            scale = 1 / (Math.pow(2, -zoom));

        var symbol = {
            path: pathDef,
            scale: scale,
            strokeWeight: 3,
            strokeColor: 'white',
            strokeOpacity: 0.5
        };

        if (!this["curveMarker"+tunnel]) {
            this["curveMarker"+tunnel] = new Marker({
                position: pos1,
                clickable: false,
                icon: symbol,
                zIndex: 0, // behind the other markers
                map: map
            });
        } else if (active){ // check if searching for ip connectivity
            symbol = {
                path: pathDef,
                scale: scale,
                strokeWeight: 5,
                strokeColor: 'green',
                zIndex: 100,
                strokeOpacity: 1,
            }
            this["curveMarker"+tunnel].setOptions({
                position: pos1,
                icon: symbol,
            });
        } else {
            this["curveMarker"+tunnel].setOptions({
                position: pos1,
                icon: symbol,
            });
        }
}

function activeTunnel(mx1,mx2){
    var tunnel = mx2+'to'+mx1,
        tunnel2 = mx1+'to'+mx2,
        active = true
    if(this["curveMarker"+tunnel]){
        createCurve(mx1, mx2, tunnel, active)
    } else if(this["curveMarker"+tunnel2]){
        createCurve(mx1, mx2, tunnel2, active)
    }
}

function mxInfoMarker(name, mode, subnetsActive, subnetsLength, model, serial, deviceLoad){
    let content = '<div class="info-content">'+
            '<div id="siteNotice">'+
            '</div>'+
            '<h5 id="firstHeading" class="firstHeading">'+name+'</h5>'+
            '<div id="bodyContent">'+
            '<table class="table"><tbody>'+
            '<tr><td><b>Mode:</b></td><td>'+mode+'</td></tr> ' +
            '<tr><td><b>Subnets:</b></td><td>'+subnetsActive+' / '+subnetsLength+'</td></tr> ' +
            '<tr><td><b>Model:</b></td><td>'+model+'</td></tr>' +
            '<tr><td><b>Serial:</b></td><td>'+serial+'</td></tr>' +        
            '<tr><td><b>Device Load:</b></td><td>'+deviceLoad+'%</td></tr>' +
            '</tbody></table></div>'+
            '</div>';
    return content
}

search = (key, inputArray) => {
    for (let i=0; i < inputArray.length; i++) {
        if (inputArray[i].networkId === key) {
            return inputArray[i].serial;
        }
    }
  }
search2 = (key, inputArray) => {
    for (let i=0; i < inputArray.length; i++) {
        if (inputArray[i][0] === key) {
            return inputArray[i][5];
        }
    }
  }


