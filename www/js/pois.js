var pois = {

	maxQuery : 10,
	located  : [],
	indexes  : [],

	nearTo: function( opt )
	{
		if( opt == null || opt.center == null || opt.success==null )
		{
			sendError('Los parametros no estan bien configurados');
			return;
		}

		var radius = (opt.radius == null) ? 10 : opt.radius;
		var POI    = Parse.Object.extend("POI");
		var query  = new Parse.Query(POI);
		var point  = new Parse.GeoPoint({latitude : opt.center.lat, longitude: opt.center.lon});
		
		
		query.withinKilometers("localizacion", point, radius);
		query.limit(pois.maxQuery);


		if( opt.filter != null )
		{
			if( opt.filter.nombre       != null ){ query.contains("nombre"      , opt.filter.nombre     ); }
			if( opt.filter.descripcion  != null ){ query.contains("descripcion" , opt.filter.descripcion); }
		}
		

		query.equalTo("tour", null );
		query.equalTo("evento", null );


		query.find({
			success : function( results ){ pois.findSuccess(results, opt.success) },
			error 	: opt.error
		});
	},


	findSuccess: function( results, callback )
	{
		for( var i in results )
		{
			var poi = results[i];
			if( pois.indexes.indexOf( poi.id ) < 0  )
			{
				pois.located.push(poi);
				pois.indexes.push(poi.id);
			}
		}
		
		callback(results);
	},


	update: function( objId, data )
	{
		var POI = Parse.Object.extend("POI");
		var query = new Parse.Query(POI);
		query.get( objId , {
			success: function( poi ) {
				if( data.calificacion != null ) poi.set("calificacion", data.calificacion);
				poi.save();
			},
			error: function(object, error) {}
		});
	},

	getElementByIndex: function( idx )
	{
		return pois.located[idx];
	},

	getElementById: function( id )
	{
		var idx = pois.indexes.indexOf( id );
		return pois.located[idx];
	},

	fromTour: function( opt )
	{
		if( opt == null || opt.id == null || opt.success==null )
		{
			sendError('Los parametros no estan bien configurados');
			return;
		}

		var POI    = Parse.Object.extend("POI");
		var query  = new Parse.Query(POI);

		query.equalTo("tour", opt.id);
		query.find({
			success : opt.success,
			error 	: opt.error
		});
	},

	fromEvent: function( opt )
	{
		if( opt == null || opt.id == null || opt.success==null )
		{
			sendError('Los parametros no estan bien configurados');
			return;
		}

		var POI    = Parse.Object.extend("POI");
		var query  = new Parse.Query(POI);

		query.equalTo("evento", opt.id);
		query.find({
			success : opt.success,
			error 	: opt.error
		});
	},


	/* BUSQUEDA
	/******************************************************************************************/
	filterBy: function( opt )
	{
		var results      = {};
		results.data     = [];
		results.metadata = [];

		for ( i in pois.located )
		{
			var poi   = pois.located[i];
			var match = 0;
			var min   = ( opt.minCoincidence != null ) ? opt.minCoincidence : 1;

			if( opt.nombre != null )
			{
				if( poi.get('nombre').contains(opt.nombre) ){ match ++; }
			}

			if( opt.descripcion != null )
			{
				if( poi.get('descripcion').contains(opt.descripcion) ){ match ++; }
			}

			if( opt.categoria != null )
			{
				if( opt.categoria.indexOf(poi.get('categoria')) >= 0 ){ match ++; }
			}

			if( opt.subcategoria != null )
			{
				if( opt.subcategoria.indexOf(poi.get('subcategoria')) >= 0 ){ match ++; }
			}

			if( opt.calificacion != null )
			{
				if( poi.get('calificacion') >= opt.calificacion ){ match ++; }
			}

			if( match > 0 && match >= min )
			{
				results.data.push(poi);
				results.metadata.push({'match': match, 'index': i })
			}

		}

		return results;
	},

}