define(["dojo/_base/declare",
			"dijit/_WidgetBase",
			"dijit/_TemplatedMixin",
			"dijit/_WidgetsInTemplateMixin",
			"dojo/text!./templates/EsriWidgets.html",
			"dojo/_base/lang",
			"dojo/_base/connect",
			"dojo/on",
			"dojo/dom-construct",
			"dojo/dom-class",
			"esri/dijit/InfoWindow",
			"dijit/form/DropDownButton",
			"dijit/TooltipDialog",
			"esri/map",
			"esri/layers/FeatureLayer",
			"esri/tasks/query",
			"esri/tasks/geometry",
			"esri/tasks/identify",
			"esri/dijit/Scalebar",
      "esri/dijit/BasemapGallery",
			"esri/dijit/Legend",
			"esri/dijit/OverviewMap",
			"esri/dijit/Bookmarks",
			"esri/dijit/Measurement"
],
		function (declare, WidgetBase, TemplatedMixin, WidgetsInTemplateMixin, template, lang, connect, on, domConstruct, domClass, InfoWindow) {
			var _this;
			return declare([WidgetBase, TemplatedMixin, WidgetsInTemplateMixin], {
				templateString: template,
				widgetsInTemplate: true,
				initExtent: null,

				constructor: function () {
					_this = this;
					initExtent = new esri.geometry.Extent({ "xmin": -15059826, "ymin": 343332, "xmax": -6508662, "ymax": 8777088, "spatialReference": { "wkid": 102100 } });
				},

				postCreate: function () {
					this.inherited(arguments);
					
					/* map 1 */
					//var infoWindow = new InfoWindow({}, dojo.create("div"));
					//infoWindow.startup();
					var map1 = new esri.Map(this.map1, {
						id:"map1",
						extent: initExtent,
						basemap: "topo",
						sliderPosition: "top-left",
						//sliderOrientation: "horizontal",
						sliderStyle: "large",
						nav: true,
						fadeOnZoom: true,
						showAttribution:false//,
						//infoWindow: infoWindow
					});

					var map1_graphic_layer = new esri.layers.GraphicsLayer({ id: "map1_graphics" });
					map1.addLayer(map1_graphic_layer);
					connect.connect(map1, "onClick", function () {
						map1.infoWindow.hide();
					});
					connect.connect(map1, "onLoad", function () {
						var scalebar = new esri.dijit.Scalebar({
							map: map1,
							scalebarUnit: "english",
							attachTo: "bottom-left"
						});

						var infoTemplate = new esri.InfoTemplate();
						infoTemplate.setTitle("infoWindow widget");

						var symbol = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 12,
							new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID,
							new dojo.Color([210, 105, 30, 0.5]), 8),
							new dojo.Color([210, 105, 30, 0.9])
						);
						var point = new esri.geometry.Point({ "x": -117.197, "y": 34.057, " spatialReference": { " wkid": 4326 } });
						var graphic = new esri.Graphic(point, symbol);
						graphic.setAttributes({ "XCoord": "1", "YCoord": "2", "Plant": "Mesa Mint" });
						graphic.setInfoTemplate(infoTemplate);
						map1_graphic_layer.add(graphic);

						//basemap gallery
						_this.initBasemapGallery(map1);
					});

					/* map 2 */
					var map2 = new esri.Map(this.map2, {
						id: "map2",
						extent: initExtent,
						basemap: "topo",
						sliderPosition: "top-left",
						//sliderOrientation: "horizontal",
						fadeOnZoom: true,
						navigationMode: "css-transforms"
					});


					var sampleLayer = new esri.layers.ArcGISDynamicMapServiceLayer("http://servicesbeta.esri.com/ArcGIS/rest/services/Earthquakes/QEDEarthquakes/MapServer");
					map2.addLayer(sampleLayer);
 
					//identify task
					var identifyTask = new esri.tasks.IdentifyTask("http://servicesbeta.esri.com/ArcGIS/rest/services/Earthquakes/QEDEarthquakes/MapServer");
					var identifyParams = new esri.tasks.IdentifyParameters();
					identifyParams.tolerance = 3;
					identifyParams.returnGeometry = false;
					identifyParams.layerOption = esri.tasks.IdentifyParameters.LAYER_OPTION_VISIBLE;
					identifyParams.width = map2.width;
					identifyParams.height = map2.height;

					connect.connect(map2, "onClick", function (evt) {
						map2.infoWindow.hide();
						identifyParams.geometry = evt.mapPoint;
						identifyParams.mapExtent = map2.extent;
						identifyParams.layerIds = [0];
						var deferred = identifyTask.execute(identifyParams);
						deferred.addCallback(function (response) {
							return dojo.map(response, function (result) {
								var feature = result.feature;
								var fieldInfos = [];
								feature.attributes.layerName = result.layerName;
								//for (var fieldName in feature.attributes) {
								//	fieldInfos.push({ fieldName: fieldName, visible: true, label: fieldName });
								//}
								fieldInfos.push({ fieldName: "Magnitude", visible: true, label: "Magnitude" });
								fieldInfos.push({ fieldName: "Latitude", visible: true, label: "Latitude" });
								fieldInfos.push({ fieldName: "Longitude", visible: true, label: "Longitude" });

								var template = new esri.dijit.PopupTemplate({
									title: result.value,
									fieldInfos: fieldInfos
								});
								feature.setInfoTemplate(template);
								return feature;
							});
						}).then(function (results) {
							if (results.length > 0) {
								map2.infoWindow.show(evt.mapPoint);
							}
						});
						map2.infoWindow.setFeatures([deferred]);
						//map2.infoWindow.show(evt.mapPoint);
					});


					connect.connect(map2, "onLoad", function () {
						this.resize();
						_this.initLegend(this);

						var overviewMapDijit = new esri.dijit.OverviewMap({
							map: this,
							attachTo: "bottom-left",
							visible: true,
							maximizeButton: true
						});
						overviewMapDijit.startup();

						_this.initMeasurement(this);
					});

					// bookmarks
					_this.initBookmarks(map2);
				},

				startup: function () {
				},

				initBasemapGallery: function (map) {
					var basemaps = [];
					var imageryLayer = new esri.dijit.BasemapLayer({
						url: "http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
					});
					var imageryBasemap = new esri.dijit.Basemap({
						layers: [imageryLayer],
						title: "Imagery",
						id: "basemap1",
						thumbnailUrl: "img/basemaps/imagery.png"
					});
					basemaps.push(imageryBasemap);
					var topoLayer = new esri.dijit.BasemapLayer({
						url: "http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer"
					});
					var topoBasemap = new esri.dijit.Basemap({
						layers: [topoLayer],
						title: "Topo",
						id:"basemap2",
						thumbnailUrl: "img/basemaps/topographic.jpg"
					});
					basemaps.push(topoBasemap);

					var basemapGallery = new esri.dijit.BasemapGallery({
						id: "basemapGallery",
						"class": "simple",
						basemaps: basemaps,
						showArcGISBasemaps: false,
						map: map,
						onSelectionChange: function () {
							var selectedBasemap = this.getSelected();
							if (selectedBasemap.id == "basemap1") { 
								domClass.add(map.container, "dark");
							}
							else {
								domClass.remove(map.container, "dark");
							}
						}
					}, domConstruct.create("div"));
					basemapGallery.startup();

					basemapGallery.select("basemap2");

					var basemapGalleryDropDown = new dijit.TooltipDialog({
						"content": basemapGallery
					});

					var basemapGalleryButton = new dijit.form.DropDownButton({
						label: "BasemapGallery Widget",
						"class": "basemaps-control",
						dropDownPosition: ['below-centered', 'above-centered'],
						dropDown: basemapGalleryDropDown
					}, _this.basemapGallery);
				},

				initLegend: function (map) {
					var legend = new esri.dijit.Legend({
						map: map,
					});
					var legendDropDown = new dijit.TooltipDialog({
						"content": legend,
						"class": "legend-dropdown-dialog"
					});

					var legendButton = new dijit.form.DropDownButton({
						label: "legend Widget",
						"class": "legend-control",
						dropDownPosition: ['below-centered', 'above-centered'],
						dropDown: legendDropDown
					}, _this.legend);

				},

				initBookmarks: function (map) {
					var bookmark = new esri.dijit.Bookmarks({
						map: map,
						bookmarks: [],
						editable: true
					}, this.mapBookmarks);

					// Add bookmarks to the widget
					var bookmarkCA = {
						"extent": {
							"spatialReference": {
								"wkid": 102100
							},
							"xmin": -14201669,
							"ymin": 4642975,
							"xmax": -13021482,
							"ymax": 5278931
						},
						"name": "Northern California"
					}
					var bookmarkPA = {
						"extent": {
							"spatialReference": {
								"wkid": 102100
							},
							"xmin": -8669334,
							"ymin": 4982379,
							"xmax": -8664724,
							"ymax": 4984864
						},
						"name": "Central Pennsylvania"
					}
					bookmark.addBookmark(bookmarkCA);
					bookmark.addBookmark(bookmarkPA);
				},

				initMeasurement: function (map) {
					var measurement = new esri.dijit.Measurement({
						map: map,
						style: "width: 300px"
					}, this.mapMeasurement);
					measurement.startup();
				}

			});
		});