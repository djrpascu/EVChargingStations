var mapMain;
var widgetEditor;
var flChargingStations;
var routeGraphicLayer;

// @formatter:off
require([
		"dojo/_base/array",
        "esri/map",
        "esri/layers/FeatureLayer",
		"esri/tasks/FeatureSet",
        "esri/tasks/GeometryService",
        "esri/dijit/editing/Editor",
        "esri/dijit/editing/TemplatePicker",
        "esri/config",
		"esri/IdentityManager",
		"esri/dijit/Search",
		"esri/dijit/LocateButton",
		"esri/tasks/RouteTask",
		"esri/tasks/RouteParameters",
		"esri/graphic",
		"esri/Color",
		
		"esri/tasks/Geoprocessor",
		"esri/tasks/DataFile",
		
        "esri/layers/GraphicsLayer",
        "esri/renderers/SimpleRenderer",

        "esri/geometry/Point",
		
        "esri/tasks/ClosestFacilityTask",
        "esri/tasks/ClosestFacilityParameters",
		
	    "esri/symbols/SimpleMarkerSymbol",
        "esri/symbols/SimpleLineSymbol",
		
        "dojo/ready",
        "dojo/parser",
        "dojo/on",
        "dojo/_base/array",

        "dijit/layout/BorderContainer",
        "dijit/layout/ContentPane"],
    function (array, Map, FeatureLayer, FeatureSet, GeometryService, Editor, TemplatePicker, config, IdentityManager, Search, LocateButton, RouteTask, RouteParameters, Graphic, Color,
			  Geoprocessor, DataFile, GraphicsLayer, SimpleRenderer, Point, ClosestFacilityTask, ClosestFacilityParameters, SimpleMarkerSymbol, SimpleLineSymbol,
              ready, parser, on, array,
              BorderContainer, ContentPane) {
// @formatter:on

        // Wait until DOM is ready *and* all outstanding require() calls have been resolved
        ready(function () {

            // Parse DOM nodes decorated with the data-dojo-type attribute
            parser.parse();

            /*
             * Step: Specify the proxy Url
             */
            config.defaults.io.proxyUrl = "http://localhost/proxy/proxy.ashx";

            // Create the map
            mapMain = new Map("divMap", {
                basemap: "hybrid",
                center: [-157.99, 21.35],
                zoom: 12
            });

            var flChargingStations, flFireLines, flFirePolygons;
            /*
             * Step: Construct the editable layers
             */
			chargingStationUrl = "http://services6.arcgis.com/GppfEaYzw3YLUhtB/arcgis/rest/services/Hawaii_Public_Electric_Vehicle_Charging_Stations/FeatureServer/0";
            flChargingStations = new FeatureLayer(chargingStationUrl, {
                outFields: ['*']
            });
			
dojo.ready(function(){
  var xhrArgs = {
    url: chargingStationUrl + "/query?where=1%3D1&returnGeometry=true&outFields=*&f=json",
    handleAs: "json",
    preventCache: true
  }

  newFacilities = dojo.xhrGet(xhrArgs);

  newFacilities.then(
      function(data){
		return data;
      },
      function(error){
		return error;
      }
  );
});
	
			

            // Listen for the editable layers to finish loading
            mapMain.on("layers-add-result", initEditor);

            // add the editable layers to the map
            mapMain.addLayers([flChargingStations]);
			
			routeTask = new RouteTask("http://sampleserver3.arcgisonline.com/ArcGIS/rest/services/Network/USA/NAServer/Route");
			routeParams = new RouteParameters();
			routeParams.stops = new FeatureSet();
			routeParams.outSpatialReference = {
				"wkid" : 102100
			};

			routeTask.on("solve-complete", showRoute);
			routeTask.on("error", errorHandler);

			function showRoute(event) {
				console.log(event);
			}
			
			function errorHandler(event) {
				console.log(event);
			}
			
			locateButton = new LocateButton({
				map: mapMain,
				scale: 16000
			}, "divLocateButton");
			locateButton.startup();
			
			locateButton.on("locate", locateSuccess);
			
			function locateSuccess(event) {
				if (event.error)
					alert("Geolocation is disabled or not supported. Please enable to use this feature");
				
				if (routeGraphicLayer)
					routeGraphicLayer.clear();
				
				console.log(event);
				locationGeometry = event.graphic;
				
				incidentFeatures = [];
				incidentFeatures.push(locationGeometry);
				incidents = new FeatureSet();
				incidents.features = incidentFeatures;
				
				params = new ClosestFacilityParameters();
				params.incidents = incidents;

    			params.impedenceAttribute = "Miles";      
			    params.defaultCutoff = 10.0;      
			    params.returnIncidents = false;
			    params.returnRoutes = true;
			    params.returnDirections = true;
				
//				dataFileFeatures = new DataFile({
//					url: chargingStationUrl + "/query?where=1%3D1&returnGeometry=true&outFields=*&f=json"
//				});


		routeGraphicLayer = new GraphicsLayer();
        
        var routePolylineSymbol = new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID, 
          new Color([255,0,0]), 
          4.0
        );
        var routeRenderer = new SimpleRenderer(routePolylineSymbol);
        routeGraphicLayer.setRenderer(routeRenderer);

        mapMain.addLayer(routeGraphicLayer);
		
		

		var facilityPointSymbol = new SimpleMarkerSymbol(
          SimpleMarkerSymbol.STYLE_SQUARE, 
          20,
          new SimpleLineSymbol(
            SimpleLineSymbol.STYLE_SOLID,
            new Color([26,26,1]), 2
          ),
          new Color([255,0,0,0.90])
        ); 
				
        var facilitiesGraphicsLayer = new GraphicsLayer();
		var facilityRenderer = new SimpleRenderer(facilityPointSymbol);
        facilitiesGraphicsLayer.setRenderer(facilityRenderer);
       
        mapMain.addLayer(facilitiesGraphicsLayer);
				
        
		facilitiesGraphicsLayer.add(new Graphic(new Point(-17580710,2432955,mapMain.spatialReference)));
		facilitiesGraphicsLayer.add(new Graphic(new Point(-17578710,2432955,mapMain.spatialReference)));
   
		//var facilities = new FeatureSet(JSON.stringify(newFacilities.results[0]));
        var facilities = new FeatureSet();
        facilities.features = facilitiesGraphicsLayer.graphics;
        

		
        params.facilities = facilities;
		
		
		
			
				

				console.log(params);
				
				closestFacilityTask = new ClosestFacilityTask("https://route.arcgis.com/arcgis/rest/services/World/ClosestFacility/NAServer/ClosestFacility_World");

				closestFacilityTask.solve(params, function(solveResult){
					console.log(solveResult);
			
					array.forEach(solveResult.routes, function(route, index){
					//build an array of route info
					var attr = array.map(solveResult.directions[index].features, function(feature){
					  return feature.attributes.text;
					});
					//var infoTemplate = new InfoTemplate("Attributes", "${*}");
					
					//route.setInfoTemplate(infoTemplate);
					//route.setAttributes(attr);
					
					routeGraphicLayer.add(route);
					});
			
				});

			}
			

			searchBox = new Search({
				map: mapMain,
			}, "divSearch");
			searchBox.startup();
			
            function initEditor(results) {

                // Map the event results into an array of layerInfo objects
                var layerInfosWildfire = array.map(results.layers, function (result) {
                    return {
                        featureLayer: result.layer
                    };
                });

                /*
                 * Step: Map the event results into an array of Layer objects
                 */
                var layersWildfire = array.map(results.layers, function (result) {
                    return result.layer;
                });

                /*
                 * Step: Add a custom TemplatePicker widget
                 */
                var tpCustom = new TemplatePicker({
                    featureLayers: layersWildfire,
                    columns: 2
                }, "divLeft");
                tpCustom.startup();

                /*
                 * Step: Prepare the Editor widget settings
                 */
                var editorSettings = {
                    map: mapMain,
                    geometryService: new GeometryService("http://sampleserver6.arcgisonline.com/arcgis/rest/services/Utilities/Geometry/GeometryServer"),
                    layerInfos: layerInfosWildfire,
                    toolbarVisible: true,
                    templatePicker: tpCustom,
                    createOptions: {
                        polygonDrawTools: [Editor.CREATE_TOOL_FREEHAND_POLYGON, Editor.CREATE_TOOL_RECTANGLE, Editor.CREATE_TOOL_TRIANGLE, Editor.CREATE_TOOL_CIRCLE]
                    },
                    toolbarOptions: {
                        reshapeVisible: true
                    },
                    enableUndoRedo: true,
                    maxUndoRedoOperations: 20
                };

                /*
                 * Step: Build the Editor constructor's first parameter
                 */
                var editorParams = {
                    settings: editorSettings
                };

                /*
                 * Step: Construct the Editor widget
                 */
                widgetEditor = new Editor(editorParams, "divTop");
                widgetEditor.startup();
            };

        });
    });
