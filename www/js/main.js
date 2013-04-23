var app = {
		
	TOURS           : null,
	currentScreen   : 'mapCanvas',
	transition      : false,
	tourView        : false,
	eventView       : false,
	scrollCategories: null,
	scrollSearch    : null,
	scrollInfo      : null,
	listaCategorias : '',
	subcategorias   : null,
	showCategories  : [],
	currentlat		: -2.2009371541325735,
	currentlng		: -79.88533663012974,
	reproducirAudio : true,
	
	
	// INIT APPLICATION
	/*******************************************************************************************************/
	/*******************************************************************************************************/

		initialize: function()
		{

			//PHONEGAP COMPLETE
			/***************************************************/
			document.addEventListener('deviceready', app.onDeviceReady, false);


			//DISE�O
			/***************************************************/
			if( navigator.userAgent.match(/(iPhone|iPod|iPad)/i) ) this.setStyle('ios');
			else this.setStyle('android');
			//evita el movimiento de objetos cuando el teclado aparece
			document.body.style.height = Math.max( document.body.scrollHeight, document.body.offsetHeight)+'px';
			//oculto la pantalla de loading
			setTimeout(function(){ x$( '#mensajes' ).removeClass( 'fullScreen loader' ); }, 5000 );
			//añado la clase de la pantalla home al body
			document.body.className += app.currentScreen+"_view";


			//EVENTOS
			/***************************************************/
			x$('#tipoMapa'          ).on('change'     , app.switchMap       );
			x$('#categoriasBtn'     ).on('touchstart' , app.switchCategories);
			x$('#busquedaBtn'       ).on('touchstart' , app.switchSearch    );
			x$('.backButton'        ).on('touchstart' , app.backScreen      );
			x$('#searchBox'         ).on('submit'     , app.sendSearch      );
			x$('#Categorias nav a'  ).on('click'      , app.selectCategory  );



			//OTRAS ACCIONES
			/***************************************************/
			// evito el movimiento de la pagina en ios
			document.addEventListener('touchmove', function (e) { e.preventDefault(); }, false);
			// cacheo el html de la lista por la sobreescritura, esto deberia mejorarse
			app.listaCategorias = x$('#scrollsearch nav').html()+'';
			//me conecto con parse para obtener los datos
			Parse.initialize("u4daJ3ZqB1O8T7wnIw0tzN7w4mJ2zVoPLAbplhXg", "unKKVJjm7mSqJow8z9XEIjzgowDuHngSVA2loUmg");
			window.addEventListener("orientationchange", app.orientationChange, true);


			//OTRAS CATEGORIAS
			/***************************************************/
			// keyname is now equal to "key"
			var value = window.localStorage.getItem("categories");
			if( value == null )
			{
				//window.localStorage.setItem("categories", '{"list":[{"nombre":"categoria nueva", "id": 67, "img":"asjfka"},{"nombre":"categoria nueva 2","id":99, "img":"asjfka"}]}');
				x$('#infoHolder').xhr('http://ecutrips.herokuapp.com/categorias.json', function() {
					window.localStorage.setItem("categories", this.responseText);
					app.processCategories(this.responseText);
					$('#infoHolder').html('');
				});
			}
			else
			{
				//window.localStorage.removeItem("categories");
				app.processCategories(value);
				value=null;
			}

		},
		

		onDeviceReady: function() 
		{
			document.addEventListener("backbutton", app.backScreen, false);
			document.addEventListener("offline"	  , app.offline	  , false);
			document.addEventListener("online"	  , app.online	  , false);

			app.updateGeoLocation();
		},

		setStyle: function( type )
		{
			document.getElementById('widget').setAttribute( 'href', 'css/'+type+'_ui.css');
			document.getElementById('design').setAttribute( 'href', 'css/'+type+'_design.css');
		},


		processCategories: function( jsonData )
		{
			var newCategories = JSON.parse( jsonData );
			for( var i=0; i<newCategories.list.length; i++)
			{
				var cat = newCategories.list[i];
				x$('#scrollsearch nav').html('bottom','<a href="#" rel="'+cat.id+'">'+cat.nombre+'</a>');
				x$('#scrollcategories nav').html('bottom','<a href="#" id="c'+cat.id+'">'+cat.nombre+'</a>');
				x$('#newCategoriesStyle').html('bottom', 'body.Categorias_view #c'+cat.id+'  { background: url('+cat.img+') 92% 50% no-repeat; background-size: auto 70%; }');
			}
			app.listaCategorias = x$('#scrollsearch nav').html()+'';
		},

		updateGeoLocation: function()
		{
			function onSucess( position )
			{
				app.currentlat = position.coords.latitude;
				app.currentlng = position.coords.longitude;
				map.moveTo( app.currentlat, app.currentlng  );
				map.updatePosition( app.currentlat, app.currentlng  );
				setTimeout( app.updateGeoLocation, 1200000);
			}
			navigator.geolocation.getCurrentPosition( onSucess, app.onError );
		},

		initMap: function()
		{
			map.create( 'mapCanvas', app.currentlat, app.currentlng );
			map.updatePosition( app.currentlat, app.currentlng );
			app.getNearPOI();
			app.getCategories();
		},

		orientationChange: function(e) {
			var orientation="portrait";
			if(window.orientation == -90 || window.orientation == 90) orientation = "landscape";
			
			document.body.style.height = Math.max( document.body.scrollHeight, document.body.offsetHeight)+'px';
		},

		playStream: function( mp3URL, btn ) {
			if( app.reproducirAudio )
			{
				try {
					var myaudio = new Audio( mp3URL );
					myaudio.id = 'playerMyAudio';
					myaudio.play();
				} catch (e) {
					alert('No hay soporte para stream de audio en este dispositivo.');
				}

				app.reproducirAudio = false;

				btn.innerHTML = '<img src="img/loader.gif" /> Cargando audio';
				setTimeout( function(){
					app.reproducirAudio = true;
					btn.innerHTML = '<span class="icon-volume-medium "></span> Escuchar audio gu&iacute;a</a>';
				},20000);
			}
		},

	// POIS
	/*******************************************************************************************************/
	/*******************************************************************************************************/
		getNearPOI: function()
		{
			pois.nearTo({
				center  : map.center(),
				radius  : 10,
				success : app.showPOIS,
				error   : app.showError
			});
		},

		showPOIS: function( poi )
		{
			map.clearOverlays();
			for( i in poi )
				map.newPOI( poi[i], app.openPOI );

			if( app.tourView ) map.drawRoute();
		},


		openPOI: function( POI )
		{
			function write()
			{
				var certificado = ( POI.get('certificado') )? true : false;
				var promocion   = ( POI.get('banner') )? true : false;
				var poiInfo 	= {
									DOM: document.createDocumentFragment(),
									createElm: function( type, content, opt )
									{
										var newElm		 = document.createElement(type);
										newElm.innerHTML = content;
										if( opt != null )
										{
											if( opt._class != null )	newElm.className = opt._class;
											if( opt.id 	   != null )	newElm.id 		 = opt.id;
											if( opt.src	   != null )	newElm.src 		 = opt.src;
										}
										this.DOM.appendChild(newElm);
									}
								};				


				
				/* IMAGENES
				**************************************************/
				var img 	 = '<ul>';
				var imagenes = POI.get('imagenes');

				for( i in POI.get('imagenes') )
				{
					var display = ( i == 0 ) ? "block" : "none";
					img += '<li style="display:'+display+'"><img src="'+imagenes[i]+'"/></li>'; 
				}
				img += '</ul>';

				poiInfo.createElm( "div", img, {_class: "swipe", id:"POIimagenes"} );


				/* CERTIFICADO
				**************************************************/
				if( certificado )
					poiInfo.createElm( "span", "Local Certificado", {id:"POIcertificado"} );


				/* PROMOCIONES
				**************************************************/
				if( typeof POI.get('promociones') != 'undefined' && POI.get('promociones') != '' )
					poiInfo.createElm( "div", "<h3>OFERTAS</h3><p>"+POI.get('promociones')+"</p>", {id: "POIofertas"});


				/* CALIFICACION
				**************************************************/
				var social = '';
				social += '<li><a href="#" id="like_btn" onClick="app.like(this,'+POI.get('calificacion')+','+"'"+POI.id+"'"+')"><span class="icon-heart"	  ></span> Me gusta &nbsp;&nbsp;['+POI.get('calificacion')+']</a></li>';
				social += '<li><a href="#" id="face_btn" onClick="app.share(this,'+"'"+POI.get('nombre')+"'"+')"><span class="icon-compartir"></span> Compartir este lugar <span class="likes"></span></a></li>';
				poiInfo.createElm( "h3", "CALIFICACI&Oacute;N");
				poiInfo.createElm( "ul" , social, {id:"POIsocial"} );


				/* AUDIO
				**************************************************/
				if( POI.get('audio') != null && POI.get('audio').url != '' )
				{
					var audio = '';
					audio += '<li><a href="#" id="audio_btn" onClick="app.playStream('+"'"+POI.get('audio').url+"'"+',this)"><span class="icon-volume-medium "></span> Escuchar audio gu&iacute;a</a></li>';
					poiInfo.createElm( "h3", "AUDIO");
					poiInfo.createElm( "ul" , audio, {id:"POIaudio"} );
				}


				/* DESCRIPCION
				**************************************************/
				if( typeof POI.get('descripcion') != 'undefined' && POI.get('descripcion') != '' )
				{
					poiInfo.createElm( "h3", "DESCRIPCI&Oacute;N");
					poiInfo.createElm( "p" , POI.get('descripcion') );
				}


				/* CONTACTO
				**************************************************/
				var contacto='';
				if( app.eventView )				{ contacto+='<li><a class="icon-location" onClick="app.changeScreen('+"'"+'mapCanvas'+"'"+');">Ver en el mapa <span>MAPA</span></a></li>'; }
				if( POI.get('telefonos') != '' ){ contacto+='<li><a class="icon-phone" 	  href="tel:'	 +POI.get('telefonos') 	+'"			>'+ POI.get('telefonos') +'<span>TELEFONO 					</span></a></li>'; }
				if( POI.get('correos')   != '' ){ contacto+='<li><a class="icon-mail " 	  href="mailto:' +POI.get('correos') 	+'"			>'+ POI.get('correos') 	 +'<span>CORREO ELECTR&Oacute;NICO 	</span></a></li>'; }
				if( POI.get('web')       != '' ){ contacto+='<li><a class="icon-link" 	  href="'		 +POI.get('web')+' target="_blank" ">'+ POI.get('web') 		 +'<span>P&Aacute;GINA WEB 			</span></a></li>'; }



				if( contacto != '' )
				{
					poiInfo.createElm( "h3", "CONTACTO");
					poiInfo.createElm( "ul" , contacto, {id:"POIcontacto"} );
				}


				/* DIRECCION
				**************************************************/
				if( typeof POI.get('direccion') != 'undefined' && POI.get('direccion') != '' )
				{
					poiInfo.createElm( "h3", "DIRECCI&Oacute;N");
					poiInfo.createElm( "p" , POI.get('direccion') );
				}


				/* PROMOCION
				**************************************************/
				if( promocion )
					poiInfo.createElm( "img", "", {src:'http://ecutrips.herokuapp.com/promocion.jpg', id: "POIbanner"});


				/* ESCRITURA Y EVENTOS
				**************************************************/
				document.getElementById('infoHolder').innerHTML = '';
				document.getElementById('infoHolder').appendChild( poiInfo.DOM );
				/* NOMBRE
				**************************************************/
				document.getElementById('titleHolder').innerHTML = POI.get('nombre');
				window.mySwipe = new Swipe( document.getElementById('POIimagenes') );
				app.scrollInfo = new iScroll('infoScroll');

				x$('.icon-link').on('click', function(e){
					alert('dfasdfa'+e.target.rel);
					navigator.app.loadUrl('http://google.com', { openExternal: true });
					e.preventDefault();
					return false;
				});

				setTimeout(function(){ app.scrollInfo.refresh(); app.scrollInfo.scrollTo(0, 0, 600); }, 800);
			}

			setTimeout(write, 400);
			app.changeScreen('POIinfo');
		},

		like: function( elm, currentLikes, objId )
		{
			/*
			TODO:
			esto funciona, pero el evento click continua aunque visualmente parece que se bloquea por que no ejecuta la actualizacion
			lo que realmente pasa es que sigue actualizando al anterior like+1 lo que devuelve el mismo valor siempre, lo que se debe
			hacer es que una vez se voto, se elimine el evento click para  evitar la actualizacion por gusto.
			/******************************************************************/
			currentLikes = parseInt(currentLikes);
			x$(elm).html('<span class="icon-heart"></span> Me gusta &nbsp;&nbsp;['+(currentLikes+1)+']</a>');
			pois.update( objId, {calificacion: currentLikes+1 } );
		},

		share: function( elm, nombrePOI )
		{
			if( window.plugins.shareKit != null )
			{
				window.plugins.shareKit.share('Me gusta '+nombrePOI, 'http://www.ecutrips.com'); 
			}
			else
			{
				window.plugins.share.show({
					subject: 'Me gusta '+nombrePOI,
					text: 'http://www.ecutrips.com'},
					function() {}, // Success function
					function() {alert('No se pudo compartir, por favor vuelve a intentarlo')} // Failure function
				);
			}
		},

	// TOURS
	/*******************************************************************************************************/
	/*******************************************************************************************************/
		getNearTOUR: function()
		{
			var TOUR  = Parse.Object.extend("TOUR");
			var query = new Parse.Query(TOUR);
			var coord = map.center();
			var point = new Parse.GeoPoint({latitude : coord.lat, longitude: coord.lon});

			query.withinKilometers("localizacion", point, 10);
			query.limit(10);
			query.find({
				success: function(results)
				{
					app.TOURS = results;
					var listado = '';
					for( i in results )
					{
						var tour = results[i];
						listado+='<a rel="'+i+'" href="#" class="show">'+tour.get('nombre')+'</a>';
					}
					x$('#tourList nav').html(listado);
					x$('#tourList').removeClass('cargando');
					setTimeout( function(){x$('#tourList nav a').on('click',app.loadTour  )}, 300);
				},
				error: app.onError
			});
		},

		loadTour: function()
		{
			var idx = parseInt( x$(this).attr('rel') );
			//map.newTour();

			pois.fromTour({
				id      : app.TOURS[idx],
				success : app.showPOIS,
				error   : app.onError, 
			});
			app.changeScreen('mapCanvas');
			//event.preventDefault();
			return false;
		},


	// EVENTOS
	/*******************************************************************************************************/
	/*******************************************************************************************************/
		getNearEVENT: function()
		{
			var EVENT  = Parse.Object.extend("EVENT");
			var query = new Parse.Query(EVENT);
			var coord = map.center();
			var point = new Parse.GeoPoint({latitude : coord.lat, longitude: coord.lon});

			query.withinKilometers("localizacion", point, 10);
			query.limit(10);
			query.find({
				success: function(results)
				{
					app.EVENTS = results;
					var listado = '';
					for( i in results )
					{
						var evento = results[i];
						listado+='<a rel="'+i+'" href="#" class="show">'+evento.get('nombre')+'</a>';
					}
					x$('#eventList nav').html(listado);
					x$('#eventList').removeClass('cargando');

					setTimeout( x$('#eventList nav a').on('click',app.loadEvent ), 300);
				},
				error: app.onError
			});
		},

		loadEvent: function()
		{
			var idx = parseInt( x$(this).attr('rel') );
			//map.newTour();

			pois.fromEvent({
				id      : app.EVENTS[idx],
				success : app.showEvent,
				error   : app.onError, 
			});

			event.preventDefault();
			return false;
		},

		showEvent: function(poi)
		{
			app.showPOIS(poi);
			app.openPOI( poi[0] );
			map.moveTo( poi[0].get('localizacion').latitude, poi[0].get('localizacion').longitude );
		},

	// BUSQUEDA
	/*******************************************************************************************************/
	/*******************************************************************************************************/
		sendSearch: function()
		{
			var q = ''+x$('#q').attr('value');

			pois.nearTo({
				center  : map.center(),
				radius  : 50,
				filter  : { nombre: q },
				success : app.showSearchResults,
				error   : app.showError
			});

			event.preventDefault();
			return false;
		},


		searchInCategory: function( category )
		{
			category = parseInt(category);
			var poisInCategory = pois.filterBy({ categoria: [category], subcategoria: 'undefined', minCoincidence: 2 });
			app.showSearchResults( poisInCategory.data );
			app.selectSubCategoria(category);
		},

		searchInSubCategory: function( category )
		{
			category = parseInt(category);
			var poisInCategory = pois.filterBy({ subcategoria: [category] });
			app.showSearchResults( poisInCategory.data );
		},


		showSearchResults: function( POIS )
		{
			var resultados = '';
			for( i in POIS )
				resultados += '<a href="#" rel="'+POIS[i].id+'">'+POIS[i].get('nombre')+'</a>'


			x$('#scrollsearch nav'  ).html(resultados);
			x$('#scrollsearch nav a').on('click', function(){
				var currentId  = x$(this).attr('rel')+'';
				var currentPoi = pois.getElementById( currentId );
				app.openPOI( currentPoi );
			});


			app.scrollSearch.refresh(); 
			app.scrollSearch.scrollTo(0, 0, 600);
		},



		getCategories: function()
		{
			var CAT   = Parse.Object.extend("categoria");
			var query = new Parse.Query(CAT);
			query.find({
				success: function(results)
				{
					app.subcategorias = results;
				},
				error: function(error) {
					//alert("Error: " + error.code + " " + error.message);
				}
			});
		},


		selectSubCategoria: function( parent )
		{
			var opciones = '';
			for( i in app.subcategorias )
			{
				if( app.subcategorias[i].get('parent') == parent )
					opciones += '<a href="#" class="subcat" rel="'+app.subcategorias[i].get('indice')+'">'+app.subcategorias[i].get('nombre')+'</a>';
			}
			x$('#scrollsearch nav'  		).html('top', opciones );
			x$('#scrollsearch nav a.subcat'	).on( 'click' , function(){app.searchInSubCategory( x$(this).attr('rel') )} );
		},



	// NAVEGACION
	/*******************************************************************************************************/
	/*******************************************************************************************************/
		selectCategory: function( category )
		{
			// Si la categoria es 0 entonces muestro todos los puntos
			/***************************************************/
			if( typeof category == 'object' ){ category = parseInt( x$(this).attr('id').toString().substr(1) ); }
			if( category == 0 ){ app.showAllPOIS(); return }


			// realizo un toggle de la categoria seleccionada
			/***************************************************/
			var idx =      app.showCategories.indexOf( category );
			if( idx < 0 )  app.showCategories.push( category );
			else           app.showCategories.splice(idx, 1);


			// hago visible solo los puntos de las categorias seleccionadas
			/***************************************************/
			for ( i in pois.located )
			{
				var val = ( app.showCategories.indexOf(pois.located[i].get('categoria')) < 0 ) ? false : true;
				map.updatePOI( i, { visible: val } );
			}


			// visualizo los cambios
			/***************************************************/
			x$('#Categorias nav #c'+category).toggleClass('selected');
			x$('#scrollcategories nav #c0'  ).removeClass('selected');
			//app.backScreen();
			event.preventDefault();
			return false;
		},


		showAllPOIS: function()
		{
			x$('#Categorias nav a.selected' ).removeClass('selected');
			x$('#scrollcategories nav #c0'  ).addClass('selected');
			app.showCategories = [];

			for ( i in pois.located )
				map.updatePOI( i, { visible: true } );

			app.backScreen();
			event.preventDefault();
			return false;
		},

		switchCategories: function( show )
		{
				 if( app.tourView	) { app.changeScreen('tourList'); 	app.scrollCategories = new iScroll('scrolltours');		}
			else if( app.eventView 	) { app.changeScreen('eventList'); 	app.scrollCategories = new iScroll('scrollevents');		}
			else 					  { app.changeScreen('Categorias'); app.scrollCategories = new iScroll('scrollcategories');	}

			setTimeout(function(){ app.scrollCategories.refresh(); app.scrollCategories.scrollTo(0, 0, 600); }, 500);

			event.preventDefault();
			return false;
		},

		switchSearch: function( show )
		{
			setTimeout(function(){  x$('#scrollsearch nav'  ).html( app.listaCategorias );
									x$('#Busqueda nav a'    ).on( 'click' , function(){app.searchInCategory( x$(this).attr('rel') )} );
								 }, 400);
			setTimeout(function(){  app.scrollSearch = new iScroll('scrollsearch');
								 }, 500);
			
			
			//x$('#searchBox input')[0].focus();
			app.changeScreen('Busqueda');
			event.preventDefault();
			return false;
		},


		switchMap: function()
		{
			app.tourView  = false;
			app.eventView = false;

			if( document.getElementById('tipoMapa').value == 'Ver Mapa' )
			{
				app.getNearPOI(); 
				app.changeScreen('Categorias');
			}
			else
			if( document.getElementById('tipoMapa').value == 'Ver Tour' )
			{
				app.getNearTOUR();
				app.changeScreen('tourList');
				app.tourView = true;
				x$('#tourList' ).addClass('cargando');
			}
			else
			if( document.getElementById('tipoMapa').value == 'Ver Eventos' )
			{
				app.getNearEVENT();
				app.changeScreen('eventList');
				app.eventView = true;
				x$('#eventList').addClass('cargando');
			}

			//event.preventDefault();
			return false;
		},

		changeScreen: function( newScreen, direction )
		{
			// Evito animaciones innecesarias
			/**************************************************/
			if ( app.currentScreen == newScreen ) return;
			if ( app.transition ) return;

			
			/* Elimino el contenido innecesario del POI
			/**************************************************/
			x$('#infoHolder').html('');


			// Aseguro la transicion y la direccion
			/**************************************************/
			var direction  = ( direction == null ) ? 'Forward' : direction;
			app.transition = true;


			// Inicio la animacion de pantallas
			/**************************************************/
			setTimeout(function(){ 	x$('#'+app.currentScreen).addClass( 'hide '+direction );
									x$('#'+newScreen).toggleClass( 'show hide '+direction );}, 20);
			setTimeout(function(){ 	x$('body').toggleClass(app.currentScreen+'_view '+newScreen+'_view ');}, 100);
			setTimeout(function(){  x$('#'+newScreen).removeClass( direction );
									x$('#'+app.currentScreen).removeClass( 'show '+direction );
									app.currentScreen = newScreen;
									app.transition = false;	}, 320);

			return false;
		},

		backScreen: function()
		{
			if( app.currentScreen == 'mapCanvas' )
			{
				var r=confirm("Cerrar aplicación")
				if (r==true)
					navigator.app.exitApp();
			}

			app.changeScreen('mapCanvas', 'Backward');

			// Elimino el focus de la busqueda, esto forza al teclado a desaparecer
			x$('#searchBox input')[0].blur(); 

			/*cuando el teclado del android aparece y se oculta mientras el mapa esta display: none
			ocasiona que el tamaño del canvas cambie produciendo problemas al mostrar nuevamente el mapa.
			con esta instruccion se obliga al mapa a recalcular las nuevas medidas, se pierde performance
			pero es la unica forma de solucionar el problema cuando el canvas es de medidas dinamicas.*/
			setTimeout(function(){ 
				map.resize(); 
				map.moveTo( map.myPosition.latitude, map.myPosition.longitude );
			},350);


			//Destruir los scrolls reduce la cantidad de memoria de la aplicacion
			/**************************************************/
			if (app.scrollInfo 		 != null){ app.scrollInfo.destroy(); 		app.scrollInfo 		 = null; }
			if (app.scrollSearch 	 != null){ app.scrollSearch.destroy(); 		app.scrollSearch 	 = null; }
			if (app.scrollCategories != null){ app.scrollCategories.destroy(); 	app.scrollCategories = null; }


			/**************************************************/
			event.preventDefault();
			return false;
		},

		onError: function( error ) {  /*alert( error );*/ },

};