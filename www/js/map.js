
var map = {
	canvas          : null,
	markers         : null,
	linePoints      : new Array(),
	polyline        : null,
	myPosition		: null,
	myMarker		: null,
	
	create: function( canvas_id, lat, lng )
	{
		var mapOptions = {
			mapTypeId           : google.maps.MapTypeId.ROADMAP,
			center              : new google.maps.LatLng(lat, lng),
			streetViewControl   : false,
			mapTypeControl      : false,
			zoom                : 14
		};
		canvas = new google.maps.Map(document.getElementById(canvas_id), mapOptions);
		this.markers=[];
		map.myMarker	= new google.maps.Marker({
			position    : new google.maps.LatLng(lat, lng),
			map         : canvas,
			draggable   : false
		});
	},

	
	updatePosition: function( lat, lng )
	{
		map.myPosition = {latitude: lat, longitude: lng };
		map.myMarker.setPosition(new google.maps.LatLng(lat, lng));
	},

	
	newPOI: function( poi, callback )
	{
		var tipo        = ( poi.get('tour') != null ) ? 'TOUR' : 'POI';
		var imagen      = ( poi.get('certificado')  ) ? "img/"+tipo+"/certificados/" : "img/"+tipo+"/normales/";
		var lat         = poi.get('localizacion').latitude;
		var lng         = poi.get('localizacion').longitude;
		var scale 		= ( poi.get('certificado')  ) ? 1.20 : 0.8;
		
		imagen += "marker"+poi.get('categoria')+".png";

		var image = {
			url: imagen,
			size: new google.maps.Size(70*scale, 70*scale),
			origin: new google.maps.Point(0, 0),
			scaledSize: new google.maps.Size(70*scale, 70*scale)
		};

		var marker   	= new google.maps.Marker({
			position    : new google.maps.LatLng(lat, lng),
			map         : canvas,
			draggable   : false,
			//animation   : google.maps.Animation.DROP,
			icon        : image
		});
		
		this.markers.push(marker);
		
		google.maps.event.addListener(marker, 'click', function(event) {
			callback(poi);
		});
	},

	updatePOI: function( idx, options )
	{
		this.markers[idx].setOptions(options);
	},


	getPOIPosition: function( idx )
	{
		if( this.markers[idx] != null )
		{
			return this.markers[idx].getPosition();            
		}
		return null;
	},


	center: function()
	{
		var center = canvas.getCenter();
		return { lat: center.lat(), lon: center.lng() };
	},


	moveTo: function( lat, lng )
	{
		var newCenter = new google.maps.LatLng(lat, lng);
		canvas.panTo( newCenter );
	},


	clearOverlays: function()
	{
		for ( i in this.markers ) {
			this.markers[i].setMap(null);
		}
		this.markers = [];

		if( map.polyline != null )
			map.polyline.setMap(null);
	},

	resize: function()
	{
		google.maps.event.trigger(canvas, 'resize');
	},

	drawRoute: function( points )
	{
		directionsDisplay = new google.maps.DirectionsRenderer(); 
		directionsDisplay.setMap(canvas);
		directionsService = new google.maps.DirectionsService();
		var last = this.markers.length - 1;
		var points = function( markers, last ){
			res = [];
			for(i=1; i < last; i++ )
				res.push({ location: markers[i].position, stopover: true});

			return res;
		};
		var request = {
			origin: map.markers[0].position,
			destination: map.markers[last].position,
			waypoints: points( map.markers, last ),
			optimizeWaypoints: true,
			travelMode: google.maps.DirectionsTravelMode.WALKING
		};

		directionsService.route(request, map.RenderCustomDirections);
	},

	RenderCustomDirections: function (response, status)
	{
		map.polyline = new google.maps.Polyline({
						path: [],
						strokeColor: '#0098cc',
						strokeWeight: 3 }); 


		if (status == google.maps.DirectionsStatus.OK)
		{
			var bounds = new google.maps.LatLngBounds();
			var legs   = response.routes[0].legs;
			for ( i=0; i<legs.length; i++ )
			{
				var steps = legs[i].steps;
				for ( j=0; j<steps.length; j++ )
				{
					var nextSegment = steps[j].path;
					for ( k=0; k<nextSegment.length; k++ )
					{
						map.polyline.getPath().push(nextSegment[k]);
						bounds.extend(nextSegment[k]);
					}
				}
			}

			map.polyline.setMap(canvas);
			canvas.fitBounds(bounds);
		}
		else alert(status);
	}

};