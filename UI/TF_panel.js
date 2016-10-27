	/**
	 * @author afruehstueck
	 */

	'use strict';

	/**
	 * TF_panel is the base class for the transfer function panel
	 * contains the container DIV (panel), the histogram canvas, one or multiple TF_widgets, the SVG context for UI elements
	 */
	var TF_panel = function( options ) {
		if( options === undefined ) options = {};
		var self = this;

		this.options = this.parseOptions( options );
		this.parent = options.parent || document.body;

		this.tf_values = [];

		this.callbacks = [];

		var container = options.container || parent.parentElement || null;

		var collapsiblePanel;
		if( this.options.panel.isCollapsible ) {
			collapsiblePanel = new Panel( { container: container } );
			collapsiblePanel.dom.id = 'tf-collapsible';
			collapsiblePanel.dom.className += ' unselectable';
			collapsiblePanel.dom.style.position = 'absolute';
			collapsiblePanel.moveTo( 0, 0 );
			collapsiblePanel.dom.style.transform = 'translateX(-100%)';

			var collapsibleText = document.createElement( 'div' );
			collapsibleText.innerHTML = 'Transfer Function Editor';
			collapsibleText.style.transform = 'rotate(-90deg)';
			collapsibleText.style.width = this.options.panel.height + 'px';
			collapsibleText.style.height = '16px';
			collapsibleText.style.boxShadow = '0px 0px 0px 1px #333 inset';
			collapsibleText.style.padding = '4px 0px';
			collapsibleText.style.transformOrigin = 'right top';
			collapsibleText.style.textAlign = 'center';
			collapsiblePanel.dom.appendChild( collapsibleText );
		}
		//parent dom element of TF panel
		var panel = new Panel( { container: container } );

		if( this.options.panel.isCollapsible ) {
			collapsiblePanel.dom.onclick = panel.toggle.bind( panel );
		}

		if( this.options.panel.showTFResult ) {
			this.tfResult = new Panel( { container: container } );
			this.tfResult.dom.style.position = 'absolute';
			this.tfResult.dom.style.background = options.panel.resultBackground;
			this.tfResult.dom.style.border = options.panel.border;
			this.tfResult.moveTo( this.options.panel.isCollapsible ? 24 : 0, this.options.panel.height );


			var img = document.createElement( 'img' );
			img.className += ' tf-result';
			img.style.width = this.options.panel.width + 'px';
			img.style.height = this.options.panel.resultHeight + 'px';
			img.style.display = 'block';
			this.tfResult.dom.appendChild( img );
			this.tfResult.img = img;
		}

		panel.dom.id = 'tf-panel';
		panel.addClass( 'overlay' );
		panel.addClass( 'unselectable' );
		panel.dom.style.left = this.options.panel.isCollapsible ? '24px' : '0px';
		panel.dom.style.background = options.panel.background;
		panel.dom.style.border = options.panel.border;
		this.panel = panel;
		panel.width = this.options.panel.width;
		panel.height = this.options.panel.height;

		//canvas for drawing background histogram
		var canvas = document.createElement( 'canvas' );
		canvas.width = panel.width;
		canvas.height = panel.height;
		canvas.style.display = 'block';
		canvas.id = 'histogram-canvas';
		this.panel.dom.appendChild( canvas );
		this.canvas = canvas;

		this.options.gradientPresets.container = this.panel.dom;
		this.panelContextMenu = this.addContextMenu( this.options.gradientPresets );

		//create SVG context for interaction elements
		var svgContext = document.createElementNS( SVG.svgNS, 'svg' );
		svgContext.setAttribute( 'xmlns', SVG.svgNS );
		svgContext.setAttribute( 'xmlns:xlink', 'http://www.w3.org/1999/xlink' );
		svgContext.setAttribute( 'width', panel.width );
		svgContext.setAttribute( 'height', panel.height );
		svgContext.setAttribute( 'id', 'tf-svg' );
		svgContext.setAttribute( 'class', 'overlay unselectable' );
		svgContext.setAttribute( 'z-index', 100 );
		this.panel.svgContext = svgContext;
		this.panel.dom.appendChild( svgContext );

		//add tf_widgets

		this.widgets = [];

		for( var index = 0; index < this.options.widgets.length; index++ ) {
			var widgetOptions = this.options.widgets[ index ];
			this.addWidget( widgetOptions );
		}
		if( this.options.widgets.length === 0 ) {
			this.addWidget(); //add one default widget
		}

		//add color picker
		options.colorpicker.container = panel.dom;
		options.colorpicker.colorScheme = this.options.panel.colorScheme;
		var cp_widget = new CP_widget( this.options.colorpicker );
		panel.cp_widget = cp_widget;

		this.draw();
	};

	TF_panel.prototype.parseOptions = function( options ) {
		if( typeof options === 'string' ) {
			options = JSON.parse( options );
		}
		/** panel appearance options
		 * background:		CSS background 		background for the panel
		 * border:			CSS border			border for the panel
		 * width:			number 				width of histogram panel
		 * height: 			number
		 * isCollapsible	boolean				describes whether collapsible sidebar should be used
		 * showTFResult		boolean				describes whether a bottom bar should show the result of the alpha blended transfer function widgets
		 * resultHeight		number				height of result bar
		 * resultBackground	CSS					background of result bar
		 * colorScheme		'dark', 'light' or 'blue'	color scheme for context menus and color picker
		 */
		options.parent = options.parent || document.body;
		options.panel = options.panel || {};
		options.panel.width = options.panel.width || 650;
		options.panel.height = options.panel.height || 150;
		options.panel.background = options.panel.background || '#000000';
		options.panel.border = options.panel.border || 'none';
		options.panel.colorScheme = options.panel.colorScheme || 'dark';
		if( options.panel.isCollapsible === undefined ) options.panel.isCollapsible = false;
		if( options.panel.showTFResult === undefined ) options.panel.showTFResult = false;
		if( options.panel.showTFResult ) {
			options.panel.resultHeight = options.panel.resultHeight || 20;
			options.panel.resultBackground = options.panel.resultBackground || '#000000';
		}
		/** histogram style options
		 * fillColor:		color				fill color for the histogram drawing
		 * lineColor:		color				line color for the histogram drawing
		 * style:			'polygon' or 'bars'	whether the histogram should be plotted as a polyline or vertical rectangular bars
		 * scale:			function			(mathematical) function by which the histogram values should be scaled (e.g. logarithmic, ...)
		 * overlayUnscaled:	boolean				whether the histogram (scaled by the 'scale' function should be overlayed with an unscaled version
		 */
		options.histogram = options.histogram || {};
		options.histogram.fillColor = options.histogram.fillColor || '#333333';
		options.histogram.lineColor = options.histogram.lineColor || '#666666';
		options.histogram.style = options.histogram.style || 'polygon';
		options.histogram.scale = options.histogram.scale || Math.log;
		if( options.histogram.overlayUnscaled === undefined ) options.histogram.overlayUnscaled = true;

		/** gradient preset options
		 * defaultPresets:	boolean			specifies whether the default presets should be loaded and appended to the custom presets. If presets is empty, default presets will be loaded anyway
		 * presets:			array 			array of { name, colorArray } objects describing gradient presets. format: [ { name: string, colors: array[ colors ] } ]
		 */
			// preset example: [ { name: 'testGradientA', colors: [ '#123456', '#de24f1', '#9933ff' ] }, { name: 'testGradientB', colors: [ '#123456', '#654132', '#fffaa1', '#d32f1e', '#f451ae' ] } ] };
		var defaultPresets = [
				{ name: 'Magma',		colors: [ '#000004', '#3b0f70', '#8c2981', '#de4968', '#fea16e', '#fcfdbf' ] },
				{ name: 'Inferno',		colors: [ '#000004', '#420a68', '#932667', '#dd513a', '#fbbc21', '#fcffa4' ] },
				{ name: 'Plasma',		colors: [ '#0d0887', '#6a00a8', '#b12a90', '#e16462', '#fca835', '#f0f921' ] },
				{ name: 'Viridis',		colors: [ '#440154', '#414487', '#2a788e', '#22a884', '#7cd250', '#fde725' ] },
				{ name: 'Organic',		colors: [ '#971904', '#ed4200', '#dfdc00', '#fffffd' ] },
				{ name: 'Steel',		colors: [ '#bdc3c7', '#2c3e50' ] },
				{ name: 'Fire',			colors: [ '#c02425', '#f0cb35' ] },
				{ name: 'Greyscale',	colors: [ '#000000', '#888888', '#ffffff' ] }
			];
		options.gradientPresets = options.gradientPresets || {};
		if( options.gradientPresets.defaultPresets === undefined ) options.gradientPresets.defaultPresets = true;
		options.gradientPresets.presets = options.gradientPresets.presets || [];
		if( options.gradientPresets.defaultPresets || options.gradientPresets.presets.length === 0 ) {
			options.gradientPresets.presets = options.gradientPresets.presets.concat( defaultPresets );
		}

		/** global widget options:
		 * globalOpacity:	number	1
		 * gradientAlpha:	boolean	true
		 * lineColor:		color	#ddd
		 * lineWidth:		number	3
		 * handle.radius	number	7
		 * handle.size		number	12
		 * handle.lineWidth	number	2
		 * handle.lineColor number	#ddd
		 * handle.color 	number	#000
		 */
		options.widget = options.widget || {};
		options.widget.globalOpacity = options.widget.globalOpacity || 1.;
		options.widget.lineColor = options.widget.lineColor || '#ddd';
		options.widget.lineWidth = options.widget.lineWidth || 3;
		if( options.widget.gradientAlpha === undefined ) options.widget.gradientAlpha = true;

		options.widget.handle = options.widget.handle || {};
		options.widget.handle.radius = options.widget.handle.radius || 7;
		options.widget.handle.size = options.widget.handle.size || 12;
		options.widget.handle.lineWidth = options.widget.handle.lineWidth || 2;
		options.widget.handle.lineColor = options.widget.handle.lineColor || '#ddd';

		options.widget.handle.color = options.widget.handle.color || '#000';
		options.widgets = options.widgets || [];

		/** array of widget options:
		 * location:		number
		 * colors:			array of color values
		 * controlPoints:	array of { value: number, alpha: number, color: color }
		 */

		for( var index = 0; index < options.widgets.length; index++ ) {
			options.widgets[ index ] = options.widgets[ index ] || {};
			options.widgets[ index ].location = options.widgets[ index ].location || null;
			options.widgets[ index ].controlPoints = options.widgets[ index ].controlPoints || [];
		}

		/** colorpicker options
		 * options.svPicker.*:			saturation/value pickerrectangle
		 * size:			number		size of rectangle
		 * cursorRadius:	number		radius of colorpicker cursor
		 *
		 * options.hPicker.*:			hue picker rectangle
		 * width:			number		width of hue picker
		 * cursorHeight:	number		height of hue picker cursor
		 * pad:				number		padding between sv picker and hue picker
		 */
		options.colorpicker = options.colorpicker || {};

		options.colorpicker.svPicker = options.colorpicker.svPicker || {};
		options.colorpicker.svPicker.size = options.colorpicker.svPicker.size || 128;
		options.colorpicker.svPicker.cursorRadius = options.colorpicker.svPicker.cursorRadius || 3;

		options.colorpicker.hPicker = options.colorpicker.hPicker || {};
		options.colorpicker.hPicker.width = options.colorpicker.hPicker.width || Math.clamp( options.colorpicker.svPicker.size / 5, 10, 25 );
		options.colorpicker.hPicker.height = options.colorpicker.svPicker.size;
		options.colorpicker.hPicker.pad = options.colorpicker.hPicker.pad || 4;
		options.colorpicker.hPicker.cursorHeight = options.colorpicker.hPicker.cursorHeight || 4;

		return options;
	};

	TF_panel.prototype.exportOptions = function() {
		this.options.widgets = [];
		for( var index = 0; index < this.widgets.length; index++ ) {
			var widget = this.widgets[ index ];
			this.options.widgets.push( widget.getOptions() );
		}
		console.log( JSON.stringify( this.options ) );
	};

	TF_panel.prototype.resize = function( width, height ) {
		console.log( width + 'x' + height );
		this.panel.width = width;
		this.panel.height = height;

		this.canvas.width = width;
		this.canvas.height = height;

		this.panel.svgContext.setAttribute( 'width', width );
		this.panel.svgContext.setAttribute( 'height', height );

		this.drawHistogram( this.options.histogram );

		for( var index = 0; index < this.widgets.length; index++ ) {
			var widget = this.widgets[ index ];
			widget.resize( width, height );
		}

		//this.draw();
	};

	/**
	 *
	 */
	TF_panel.prototype.addContextMenu = function( options ) {
		if( options === undefined ) options = {};
		var self = this;
		var container = options.container || document.body;
		var colorScheme = this.options.panel.colorScheme || 'dark';
		var panelContextMenu = new ContextMenu( { container: container, colorScheme: colorScheme } );

		var folderName = 'Add widget';
		panelContextMenu.addFolder( folderName );

		function createGradientPresetObject( name, colors ) {
			return {
				name: name,
				folder: folderName,
				colors: colors,
				callback: function( e ) {
					// add new tf widget at top-left position of context menu
					var positionTop = panelContextMenu.panel.top;
					var positionLeft = panelContextMenu.panel.left;
					var value = positionLeft / self.panel.width;
					//this line will take into account the y-mouse position, but this results in undesirable behaviour, creating widgets that go out of border
					//var alpha = 1.0 - ( positionTop / self.panel.height );
					var alpha = 0.2;
					self.addWidget( { location: { x: value, y: alpha }, colors: colors } );
				}
			};
		}

		var menuObjects = [];
		for( var index = 0; index < options.presets.length; index++ ) {
			var preset = options.presets[ index ];
			menuObjects.push( createGradientPresetObject( preset.name, preset.colors ) );
		}

		panelContextMenu.addItems( menuObjects );
		function showContextMenu( e ) {
			var mouse = UI.getRelativePosition( e.clientX, e.clientY, container );

			self.panelContextMenu.showAt( mouse.x, mouse.y );

			//document.addEventListener( 'mousedown', self.panelContextMenu.hideMenu, { once: true } );
			document.addEventListener( 'mousedown', self.panelContextMenu.hideMenu );

			//disable default context menu
			e.preventDefault();
		}

		this.panel.dom.addEventListener( 'contextmenu', showContextMenu );
		return panelContextMenu;
	};

	TF_panel.prototype.addWidget = function( options ) {
		if( options === undefined ) options = {};
		//copy global widget options to widget's options
		for (var attrname in this.options.widget ) {
			options[ attrname ] = this.options.widget[ attrname ];
		};

		options.colorScheme = this.options.panel.colorScheme;

		var widget = new TF_widget( this.panel, this.panel.dom, options );
		var self = this;
		widget.registerCallback( this.fireChange.bind( self ) );
		widget.destroyCallback = this.deleteWidget.bind( self );
		widget.bringToFront = this.bringToFront.bind( self );
		widget.sendToBack = this.sendToBack.bind( self );

		this.widgets.push( widget );

		this.draw();
	};

	/**
	 * takes widget from array and puts it into last array position (but behind svgContext!)
	 * swaps dom position
	 */
	TF_panel.prototype.bringToFront = function( widget ) {
		var index = this.widgets.indexOf( widget );

		this.panel.dom.insertBefore( widget.canvas, this.panel.svgContext );
		this.widgets.splice( this.widgets.length - 1, 0, this.widgets.splice( index, 1 )[ 0 ] );
		this.draw();
	};


	/**
	 * takes widget from array and puts it into first array position
	 * swaps dom position
	 */
	TF_panel.prototype.sendToBack = function( widget ) {
		var index = this.widgets.indexOf( widget );

		this.panel.dom.insertBefore( widget.canvas, this.widgets[ 0 ].canvas );
		this.widgets.splice( 0, 0, this.widgets.splice( index, 1 )[ 0 ] );
		this.draw();
	};


	/**
	 * removes widget from array
	 * swaps dom position
	 */
	TF_panel.prototype.deleteWidget = function( widget ) {
		var index = this.widgets.indexOf( widget );
		this.widgets.splice( index, 1 );

		this.draw();
		this.fireChange();
	};

	/**
	 * attach a callback function to color object
	 * owner is the element the function is contained in
	 * callback is the actual callback function
	 */
	TF_panel.prototype.registerCallback = function( callback ) {
		if ( this.callbacks.indexOf( callback ) < 0 ) {
			this.callbacks.push( callback );
		}
	};

	TF_panel.prototype.fireChange = function() {
		this.updateTF();

		for( var index = 0; index < this.callbacks.length; index++ ) {
			var callback = this.callbacks[ index ];
			callback();
		}
	};

	TF_panel.prototype.setHistogram = function( histogram ) {
		var self = this;
		this.histogram = histogram;

		//small indicator for histogram tracing
		if( !this.histogramHover ) {
			this.histogramHover = SVG.createCircle( this.panel.svgContext, 0, 0, 'none', 4, '#666' );
			this.histogramHover.setAttribute( 'visibility', 'hidden' );
			this.histogramHover.class = 'tooltip';
		}

		//tooltip for displaying value of histogram trace
		if( !this.histogramTooltip ) {
			this.histogramTooltip = document.createElement( 'div' );

			this.histogramTooltip.className = 'tooltip unselectable ' + this.options.panel.colorScheme;
			this.panel.dom.insertBefore( this.histogramTooltip, this.panel.svgContext );
		}

		//show tooltips on hover over tf panel
		this.panel.svgContext.addEventListener( 'mousemove', function ( e ) {
			var mouse = UI.getRelativePosition( e.clientX, e.clientY, self.panel.dom );

			var binWidth = this.canvas.width / histogram.numBins;
			var bin = Math.floor( mouse.x / binWidth );

			var xHover = mouse.x;
			var yHover = this.canvas.height - this.canvas.height * histogram.scale( this.histogram.bins[ bin ] ) / histogram.scale( this.histogram.maxBinValue );
			if ( yHover === Infinity ) yHover = this.canvas.height;

			if ( !isNaN( xHover ) ) this.histogramHover.setAttribute( 'cx', xHover );
			if ( !isNaN( yHover ) ) this.histogramHover.setAttribute( 'cy', yHover );

			this.histogramTooltip.innerHTML = 'value: ' + Math.floor( ( mouse.x / this.canvas.width ) * 255 ) + '<br>' + 'count: ' + this.histogram.bins[ bin ];
			this.histogramTooltip.style.left = xHover + 'px';
			this.histogramTooltip.style.top = yHover + 'px';
		}.bind( self ), true );

		this.drawHistogram( this.options.histogram );
	};

	//redraw
	TF_panel.prototype.draw = function() {
		for( var index = 0; index < this.widgets.length; index++ ) {
			var widget = this.widgets[ index ];
			widget.drawWidget( false );
		}
	};

	/*
	 * draw the histogram to the histogram canvas
	 */
	TF_panel.prototype.drawHistogram = function( options ) {
		if( !this.histogram ) return;
		if( options === undefined ) options = {};
		var canvas = this.canvas;
		var context = canvas.getContext( '2d' );

		context.clearRect( 0, 0, canvas.width, canvas.height );
		context.fillStyle = options.fillColor;
		context.strokeStyle = options.lineColor;

		var xScale = canvas.width / this.histogram.numBins;

		/* plots the histogram bins as a polygon that traces the centers of each bin */
		var drawPolygonHistogram = function ( scale ) {
			context.beginPath();
			var maxVal = scale( this.histogram.maxBinValue );

			context.moveTo( 0, canvas.height );
			context.lineTo( 0, canvas.height - canvas.height * scale( this.histogram.bins[ 0 ] ) / maxVal );

			var x = xScale / 2;
			for( var bin = 0; bin < this.histogram.numBins; bin++ ) {
				context.lineTo( x, canvas.height - canvas.height * scale( this.histogram.bins[ bin ] ) / maxVal );
				x += xScale;
			}
			context.lineTo( canvas.width, canvas.height - canvas.height * scale( this.histogram.bins[ this.histogram.numBins - 1 ] ) / maxVal );
			context.lineTo( canvas.width, canvas.height );
			context.lineTo( 0, canvas.height );

			context.closePath();
			context.fill();
			context.stroke();
		};

		/* plots the histogram bins as a series of n vertical bars (n = number of bins) */
		var drawBarHistogram = function( scale ) {
			var maxVal = scale( this.histogram.maxBinValue );
			context.beginPath();

			for( var bin = 0; bin < this.histogram.numBins; bin++ ) {
				context.moveTo( xScale * bin, canvas.height );
				context.lineTo( xScale * bin, canvas.height - ( canvas.height * scale( this.histogram.bins[ bin ] ) ) / maxVal );
			}

			context.closePath();
			context.strokeStyle = options.fillColor;
			context.lineWidth = xScale;
			context.stroke();
		};

		var style = options.style || 'polygon';
		var scale = options.scale || Math.log;
		this.histogram.scale = scale;
		var overlayUnscaled = options.overlayUnscaled;
		var identityFunction = function( x ) { return x; };
		if( overlayUnscaled ) {
			context.globalAlpha = 0.6;
		}
		if( style === 'polygon' ) {
			drawPolygonHistogram.call( this, scale );
			if( overlayUnscaled ) {
				drawPolygonHistogram.call( this, identityFunction );
			}
		} else if( style === 'bars' ) {
			drawBarHistogram.call( this, scale );
			if( overlayUnscaled ) {
				drawBarHistogram.call( this, identityFunction );
			}
		}
	};

	TF_panel.prototype.getTF = function() {
		return this.tf_values;
	};

	TF_panel.prototype.updateTF = function() {
		var eps = 1e-4;
		var values = [];
		//find all values from all widgets along x-axis
		for( var indexW = 0; indexW < this.widgets.length; indexW++ ) {
			var widget = this.widgets[ indexW ];
			var controlPoints = widget.controlPoints;
			var start = controlPoints[ 0 ].value;
			var end = controlPoints[ controlPoints.length - 1 ].value;

			//add additional controlpoints with very small offset to simulate vertical borders of tf widget
			values.push( ( start < end ) ? start - eps : start + eps );
			values.push( ( start < end ) ? end + eps : end - eps );

			for( var indexC = 0; indexC < controlPoints.length; indexC++ ) {
				var controlPoint = controlPoints[ indexC ];
				values.push( controlPoint.value );
			}
		}

		//sort values by size
		values.sort( function( a, b ) { return ( a - b ); } );

		var rgbaSum = function( color1, color2 ) {
			var a = color1.a + color2.a * ( 1 - color1.a );
			return {
				r: ( a === 0 ) ? 0 : ( color1.r * color1.a  + color2.r * color2.a * ( 1 - color1.a ) ) / a,
				g: ( a === 0 ) ? 0 : ( color1.g * color1.a  + color2.g * color2.a * ( 1 - color1.a ) ) / a,
				b: ( a === 0 ) ? 0 : ( color1.b * color1.a  + color2.b * color2.a * ( 1 - color1.a ) ) / a,
				a: a
			}
		};

		this.tf_values = [];
		for( var indexV = 0; indexV < values.length; indexV++ ) {
			var value = values[ indexV ];
			var colorsAtValue = [];
			for( var indexW = 0; indexW < this.widgets.length; indexW++ ) {
				var widget = this.widgets[ indexW ];
				var rgba = {};
				var point = widget.findControlPoint( value );
				if( point ) {
					//var hex = point.color;
					//rgba = Object.assign( point.color );
					rgba = { r: point.color.r, g: point.color.g, b: point.color.b };
					rgba.a = point.alpha;
				} else {
					var neighbors = widget.findNeighborControlPoints( value );

					if( neighbors.left === null || neighbors.right === null ) {
						//value is not in range of current widget, return empty color
						rgba = { r: 0, g: 0, b: 0, a: 0 };
					} else {
						//interpolate new color and alpha at current value
						var pct = ( value - neighbors.left.value ) / ( neighbors.right.value - neighbors.left.value );
						var rgb = Math.interpolate( [ neighbors.left.color.r, neighbors.left.color.g, neighbors.left.color.b ], [ neighbors.right.color.r, neighbors.right.color.g, neighbors.right.color.b ], pct );
						var a = Math.interpolate( neighbors.left.alpha, neighbors.right.alpha, pct );

						rgba = { r: rgb[ 0 ], g: rgb[ 1 ], b: rgb[ 2 ], a: a };
					}
				}
				colorsAtValue.push( rgba );
			}

			var blendedColor = { r: 0, g: 0, b: 0, a: 0 };
			for( var index = 0; index < colorsAtValue.length; index++ ) {
				var color = colorsAtValue[ index ];
				blendedColor = rgbaSum( color, blendedColor );
			}
			blendedColor.r = Math.round( blendedColor.r );
			blendedColor.g = Math.round( blendedColor.g );
			blendedColor.b = Math.round( blendedColor.b );

			this.tf_values.push( [ value, blendedColor ] );
		}

		if( this.options.panel.showTFResult ) {
			this.plotTFResults( this.tfResult.img );
		}
	};

	TF_panel.prototype.plotTFResults = function( img ) {
		var tfCanvas = document.createElement( 'canvas' );
		tfCanvas.height = img.height || img.clientHeight;
		tfCanvas.width = img.width || img.clientWidth;

		var context = tfCanvas.getContext( '2d' );

		var gradient = context.createLinearGradient( 0, 0, tfCanvas.width, 0 ); //horizontal gradient

		for( var index = 0; index < this.tf_values.length; index++ ) {
			var item = this.tf_values[ index ];
			var value = item[ 0 ];
			var rgba = item[ 1 ];
			var rgbaColorString = 'rgba( ' + rgba.r + ', ' + rgba.g + ', ' + rgba.b + ', ' + rgba.a + ')';
			gradient.addColorStop( Math.clamp( value, 0, 1 ), rgbaColorString );
		}

		context.fillStyle = gradient;
		context.fillRect( 0, 0, tfCanvas.width, tfCanvas.height );

		img.src = tfCanvas.toDataURL();

		//plot individual widgets one after another to canvas instead of using calculated points
		/*
		 img = document.querySelector( '.debug_x' );
		 tfCanvas = document.createElement( 'canvas' );
		 tfCanvas.height = img.clientHeight;
		 tfCanvas.width = img.clientWidth;

		 context = tfCanvas.getContext( '2d' );

		 for( var widget of this.widgets ) {
		 //find minima and maxima (without sorting points)
		 var start = 1, end = 0;

		 for( var controlPoint of widget.controlPoints ) {
		 if( controlPoint.value < start ) start = controlPoint.value;
		 if( controlPoint.value > end ) end = controlPoint.value;
		 }
		 var width = end - start;

		 var gradient = context.createLinearGradient( start * tfCanvas.width, 0, end * tfCanvas.width, 0 ); //horizontal gradient

		 for( var controlPoint of widget.controlPoints ) {
		 //var rgbColor = Color.parseColor( controlPoint.color );
		 var rgbaColorString = 'rgba( ' + controlPoint.color.r + ', ' + controlPoint.color.g + ', ' + controlPoint.color.b + ', ' + controlPoint.alpha + ')';
		 gradient.addColorStop( ( controlPoint.value - start ) / width, rgbaColorString );
		 }

		 context.fillStyle = gradient;
		 context.fillRect( start * tfCanvas.width, 0, ( end - start ) * tfCanvas.width, tfCanvas.height )
		 }

		 img.src = tfCanvas.toDataURL();
		 */
	};

	/**
	 *  TF_widget contains one range of two or more control points
	 */
	var TF_widget = function ( parent, container, options ) {
		if( options === undefined ) options = {};

		var self = this;
		this.parent = parent;
		this.container = container;
		this.callbacks = [];

		options.location = options.location || null;
		options.controlPoints = options.controlPoints || [];
		options.globalOpacity = options.globalOpacity || 1.;
		this.options = options;

		//create canvas for gradient background
		var canvas = document.createElement( 'canvas' );
		this.canvas = canvas;

		canvas.width = parent.width;
		canvas.height = parent.height;
		canvas.className = 'tf-widget-canvas overlay';
		canvas.style.opacity = options.globalOpacity;
		//insert canvases below UI svg context
		container.insertBefore( canvas, parent.svgContext );

		this.controlPoints = [];

		this.controlPoints.sortPoints = function() {
			this.sort( function( a, b ) { return ( a.value - b.value ); } );
		};

		this.controlPoints.addPoint = function( point ) {
			this.push( point );
			this.sortPoints();
		};

		this.createOutline();
		this.createVerticalHandles();

		var default_colors = [ '#440154', '#414487', '#2a788e', '#22a884', '#7cd250', '#fde725' ]; //viridis

		if( options.location ) {
			options.colors = options.colors || default_colors;
			this.addControlPoints( options.colors, options.location );// 0.3, 0.3, options.location.x, options.location.y );
		}

		if( options.controlPoints.length > 0 ) {
			for( var index = 0; index < options.controlPoints.length; index++ ) {
				var controlPoint = options.controlPoints[ index ];
				this.addControlPoint( controlPoint );
			}
		} else if( this.controlPoints.length === 0 ) {
			this.addControlPoints( default_colors, { x: 0.5, y: 0.25 } );// 0.3, 0.5, options.location.x, 0.25 ); //add one default widget
		}

		this.updateHandles();

		this.createAnchor();
	};

	TF_widget.prototype.resize = function( width, height ) {
		this.canvas.width = width;
		this.canvas.height = height;

		this.outline.resize( width, height );
		this.handles.left.resize( width, height );
		this.handles.right.resize( width, height );

		for( var index = 0; index < this.controlPoints.length; index++ ) {
			var controlPoint = this.controlPoints[ index ];
			this.updateControlPoint( controlPoint );
		}

		this.updateWidget();
	};

	TF_widget.prototype.getOptions = function() {
		var options = {};
		options.controlPoints = [];
		for( var index = 0; index < this.controlPoints.length; index++ ) {
			var controlPoint = this.controlPoints[ index ];
			options.controlPoints.push( { value: controlPoint.value, alpha: controlPoint.alpha, color: Color.RGBtoHEX( controlPoint.color ) } );
		}
		return options;
	};

	TF_widget.prototype.destructor = function() {
		while( this.controlPoints.length > 0 ) {
			var deletedPoint = this.controlPoints.pop();
			this.parent.svgContext.removeChild( deletedPoint.handle );

		}
		this.parent.svgContext.removeChild( this.outline );
		this.parent.svgContext.removeChild( this.handles.left );
		this.parent.svgContext.removeChild( this.handles.right );
		this.parent.svgContext.removeChild( this.anchor );
		this.parent.dom.removeChild( this.canvas );
		this.destroyCallback( this );
	};

	TF_widget.prototype.registerCallback = function( callback ) {
		if ( this.callbacks.indexOf( callback ) < 0 ) {
			this.callbacks.push( callback );
		}
	};

	TF_widget.prototype.fireChange = function() {
		for( var index = 0; index < this.callbacks.length; index++ ) {
			var callback = this.callbacks[ index ];
			callback();
		}
	};

	TF_widget.prototype.createAnchor = function() {
		var parent = this.parent;
		var container = this.container;
		var anchor = SVG.createRect( this.parent.svgContext, 0, 0, this.options.handle.color, this.options.handle.size, this.options.handle.size, this.options.handle.lineColor, this.options.handle.lineWidth );
		anchor.addClass( 'handle' );
		this.anchor = anchor;

		var self = this;
		var drawWidgetBound = this.drawWidget.bind( self );
		var moveAnchorBound = moveAnchor.bind( self );
		anchor.moveLock = 'N';

		/* moves anchor on mousemove while mouse down */
		function moveAnchor( e ) {
			e.preventDefault();
			e.stopPropagation();
			var mouse = UI.getRelativePosition( e.clientX, e.clientY, parent.dom );

			//restrict area of movement for control points
			//todo this is not handled very well yet
			//if( mouse.x < 0 || mouse.x > this.canvas.width || mouse.y < 0 || mouse.y > this.canvas.height ) return;

			mouse.x = Math.clamp( mouse.x, 0, this.canvas.width );
			mouse.y = Math.clamp( mouse.y, 0, this.canvas.height );

			parent.addClass( 'move' );

			var offsetX = anchor.data.x - mouse.x;
			var offsetY = anchor.data.y - mouse.y;

			if( mouse.x === 0 || mouse.x === this.canvas.width ) offsetX = 0;
			if( mouse.y === 0 || mouse.y === this.canvas.height ) offsetY = 0;

			if ( e.shiftKey && anchor.moveLock == 'N' ) {
				anchor.moveLock = ( Math.abs( offsetX ) > Math.abs( offsetY ) ) ? 'H' : 'V';
			}
			var setX = ( anchor.moveLock !== 'V' ) ? mouse.x : null;
			var setY = ( anchor.moveLock !== 'H' ) ? mouse.y : null;

			anchor.set( setX, setY );

			if( anchor.moveLock === 'H' ) offsetY = 0;
			if( anchor.moveLock === 'V' ) offsetX = 0;

			for( var index = 0; index < this.controlPoints.length; index++ ) {
				var controlPoint = this.controlPoints[ index ];
				this.updateControlPoint( controlPoint, { x: controlPoint.handle.data.x - offsetX, y: controlPoint.handle.data.y - offsetY } );
			}

			this.updateHandles();

			drawWidgetBound();
			return false;
		}

		function onMouseUp() {
			this.anchor.moveLock = 'N';
			parent.removeClass( 'move' );
			document.removeEventListener( 'mousemove', moveAnchorBound );
		}

		function onMouseDown( e ) {
			if ( e.which !== 1 ) { //left mouse button
				return false;
			}
			document.addEventListener( 'mousemove', moveAnchorBound );
			//remove mouse move event on mouseup (one-time event)
			//document.addEventListener( 'mouseup', onMouseUp.bind( self ), { once: true } );
			document.addEventListener( 'mouseup', onMouseUp.bind( self ) );
		}

		function showContextMenu( e ) {
			var mouse = UI.getRelativePosition( e.clientX, e.clientY, container );

			//create context menus for rightclick interaction

			var colorScheme = self.options.colorScheme || 'dark';
			var widgetContextMenu = new ContextMenu( { container: container, colorScheme: colorScheme } );
			var menuItems = [
				{ name: 'Bring to front',	callback: function() { self.bringToFront( self ); } },
				{ name: 'Send to back',		callback: function() { self.sendToBack( self ); } },
				{ name: 'Delete widget', 	callback: self.destructor.bind( self ) }
			];
			widgetContextMenu.addItems( menuItems );

			widgetContextMenu.showAt( mouse.x, mouse.y );

			//document.addEventListener( 'mousedown', widgetContextMenu.destroyMenu, { once: true } );
			document.addEventListener( 'mousedown', widgetContextMenu.destroyMenu );

			//disable default context menu
			e.preventDefault();
			e.stopPropagation();
			return false;
		}
		anchor.addEventListener( 'contextmenu', showContextMenu );

		//add mouse move event when mouse is pressed
		anchor.addEventListener( 'mousedown', onMouseDown );

		this.updateAnchor();
	};

	TF_widget.prototype.createOutline = function() {
		var self = this;

		var parent = this.parent;
		var outline = SVG.createPolyline( this.parent.svgContext, null, this.canvas.width, this.canvas.height, 'value', 'alpha', true, this.options.lineColor, this.options.lineWidth );
		outline.addClass( 'handle' );
		this.outline = outline;

		/**
		 * Add control point on shift+click or double-click on outline
		 */
		function onOutlineClick( e ) {
			var mouse = UI.getRelativePosition( e.clientX, e.clientY, parent.dom );

			var value = mouse.x / parent.width;
			var alpha = 1.0 - ( mouse.y / parent.height );

			console.log( 'outline clicked at ' + value + ', ' + alpha );

			var neighbors = self.findNeighborControlPoints( value );

			var leftColor = Color.parseColor( neighbors.left.color ),
				rightColor = Color.parseColor( neighbors.right.color );

			var pct = ( value - neighbors.left.value ) / ( neighbors.right.value - neighbors.left.value );
			var rgb = Math.interpolate( [ leftColor.r, leftColor.g, leftColor.b ], [ rightColor.r, rightColor.g, rightColor.b ], pct );

			var color = Color.RGBtoHEX( rgb[ 0 ], rgb[ 1 ], rgb[ 2 ] );

			self.addControlPoint( value, alpha, color );
		}

		function onOutlineMouseDown( e ) {
			if ( e.shiftKey ) {
				onOutlineClick( e );
			}
		}

		outline.addEventListener( 'mousedown', onOutlineMouseDown );
		outline.addEventListener( 'dblclick', onOutlineClick );

		//change cursor on hover+shift-hold to indicate addPoint function
		outline.addEventListener( 'mousemove', function( e ) {
			if ( e.shiftKey ) {
				outline.addClass( 'addCursor' );
			}
		} );

		//remove cursor on mouseout
		outline.addEventListener( 'mouseleave', function() {
			outline.removeClass( 'addCursor' );
		} );
	};

	/**
	 * vertical draggable SVG lines at start and endpoint of widget
	 */
	TF_widget.prototype.createVerticalHandles = function() {
		var self = this;
		var parent = this.parent;

		var handleRight = SVG.createVLine( this.parent.svgContext, null, this.canvas.width, this.canvas.height, true, this.options.lineColor, this.options.lineWidth );
		handleRight.addClass( 'handle' );
		handleRight.handleType = 'right';
		var handleLeft = SVG.createVLine( this.parent.svgContext, null, this.canvas.width, this.canvas.height, true, this.options.lineColor, this.options.lineWidth );
		handleLeft.addClass( 'handle' );
		handleLeft.handleType = 'left';
		this.handles = {};
		this.handles.right = handleRight;
		this.handles.left = handleLeft;

		/**
		 * Mouse events for vertical widget edges
		 */
		var boundMouseMoveLeft = onHandlesMouseMove.bind( handleLeft );
		var boundMouseMoveRight = onHandlesMouseMove.bind( handleRight );
		var updateWidgetBound = this.updateWidget.bind( self );
		function onHandlesMouseDownLeft( e ) {
			document.addEventListener( 'mousemove', boundMouseMoveLeft );
			document.addEventListener( 'mouseup', function() {
				document.removeEventListener( 'mousemove', boundMouseMoveLeft );
				updateWidgetBound();
			//}, { once: true }  );
			} );
		}

		function onHandlesMouseDownRight( e ) {
			document.addEventListener( 'mousemove', boundMouseMoveRight );
			document.addEventListener( 'mouseup', function() {
				document.removeEventListener( 'mousemove', boundMouseMoveRight );
				updateWidgetBound();
			//}, { once: true }  );
			} );
		}

		/**
		 * update control points by scaling range of points when dragging vertical edge of widget
		 */
		function onHandlesMouseMove( e ) {
			var mouse = UI.getRelativePosition( e.clientX, e.clientY, parent.dom );

			var value = mouse.x / parent.width;
			var alpha = 1.0 - ( mouse.y / parent.height );

			var leftControlPoint = self.controlPoints[ 0 ];
			var rightControlPoint = self.controlPoints[ self.controlPoints.length - 1 ];

			var start = ( this.handleType === 'left' ) ? rightControlPoint : leftControlPoint;
			var end   = ( this.handleType === 'left' ) ? leftControlPoint : rightControlPoint;
			var oldRange = end.value - start.value;
			var newRange = value - start.value;

			if( Math.abs( newRange ) < 1e-4 ) return; //avoid setting all points to zero while dragging over widget edge (leads to loss of distance between points)

			if( ( this.handleType === 'left' ) && value >= start || ( this.handleType === 'right' ) && value <= start ) return;

			for( var index = 0; index < self.controlPoints.length; index++ ) {
				var controlPoint = self.controlPoints[ index ];
				var position = ( oldRange != 0 ) ? ( controlPoint.value - start.value ) / oldRange : 0; //avoid divide by zero (should not happen)
				self.updateControlPoint( controlPoint, { value: start.value + ( position * newRange ) } );
			}

			updateWidgetBound( false ); //update widget without re-sorting the controlpoints
		}

		handleLeft.addEventListener( 'mousedown', onHandlesMouseDownLeft );
		handleRight.addEventListener( 'mousedown', onHandlesMouseDownRight );
	};

	TF_widget.prototype.addControlPoints = function( colors, location ) {
		var rangeValues, rangeAlpha, anchorValue, anchorAlpha;

		rangeValues = ( location.left && location.right ) ? location.right - location.left : 0.3;
		rangeAlpha = ( location.top && location.bottom ) ? location.top - location.bottom : 0.3;

		var stepValues = rangeValues / ( colors.length - 1 );
		var stepAlpha = rangeAlpha / ( colors.length - 1 );

		var startValues =  location.left ? location.left : ( location.x ? location.x : 0.5 ) - ( rangeValues / 2 );
		var startAlpha = location.bottom ? location.bottom : ( location.y ? 2 * location.y : 0.25 ) - ( rangeAlpha / 2 );

		startValues = Math.clamp( startValues, 0, 1 );
		startAlpha = Math.clamp( startAlpha, 0, 1 );
		//colors.map( ( color, index ) => { this.addControlPoint( startValues + index * stepValues, startAlpha + index * stepAlpha, color ); } );
		var self = this;
		colors.map( function( color, index ) { self.addControlPoint( startValues + index * stepValues, startAlpha + index * stepAlpha, color ); } );
	};

	TF_widget.prototype.addControlPoint = function( value, alpha, color ) {
		if( color === undefined ) color = '#000';
		var parent = this.parent;
		var container = this.container;

		if( typeof value === 'object' ) {
			color = value.color;
			alpha = value.alpha;
			value = value.value;
		}

		var controlPoint = { value: value, alpha: alpha, color: Color.parseColor( color ) };

		// circular handle for controlpoint
		var handle = SVG.createCircle( parent.svgContext, value * this.canvas.width, this.canvas.height - alpha * this.canvas.height, Color.RGBtoHEX( controlPoint.color ), this.options.handle.radius, this.options.handle.lineColor, this.options.handle.lineWidth );
		handle.addClass( 'handle' );

		var width = parent.width,
			height = parent.height;

		var self = this;
		var updateWidgetBound = this.updateWidget.bind( self );
		var drawWidgetBound = this.drawWidget.bind( self );
		var moveHandleBound = moveHandle.bind( self );

		/**
		 * Handle mouse events
		 */

		/* moves control point handles on mousemove while mouse down */
		function moveHandle( e ) {
			var mouse = UI.getRelativePosition( e.clientX, e.clientY, this.container );

			//restrict area of movement for control points
			//todo this is not handled very well yet
			//if( mouse.x < 0 || mouse.x > width || mouse.y < 0 || mouse.y > height ) return;
			mouse.x = Math.clamp( mouse.x, 0, width );
			mouse.y = Math.clamp( mouse.y, 0, height );

			this.updateControlPoint( controlPoint, { x: mouse.x, y: mouse.y } );

			//update widget through callback function
			updateWidgetBound();
		}

		function onMouseUp() {
			document.removeEventListener( 'mousemove', moveHandleBound );
		}

		function onMouseDown( e ) {
			e.preventDefault();
			if ( e.shiftKey ) {
				self.deleteControlPoint( controlPoint );
				updateWidgetBound();
			}

			document.addEventListener( 'mousemove', moveHandleBound );
			//remove mouse move event on mouseup
			//document.addEventListener( 'mouseup', onMouseUp, { once: true } );
			document.addEventListener( 'mouseup', onMouseUp );
		}

		//add mouse move event when mouse is pressed
		handle.addEventListener( 'mousedown', onMouseDown );

		handle.addEventListener( 'dblclick', function( e ) {
			e.preventDefault();
			console.log( 'request colorpicker' );

			var mouse = UI.getRelativePosition( e.clientX, e.clientY, container );

			parent.cp_widget.showAt( mouse.x, mouse.y, handle );
			parent.cp_widget.color.registerCallback( handle, function( col ) {
				var colHex = Color.RGBtoHEX( col.rgb );
				handle.setFillColor( colHex );
				//slightly messy: create new color object instead of reusing (will cause errors when color is changed)
				controlPoint.color = Color.RGB( col.rgb.r, col.rgb.g, col.rgb.b );
				drawWidgetBound();
			} );
			parent.cp_widget.color.set( controlPoint.color, handle );
			parent.cp_widget.panel.show();

			//document.addEventListener( 'mousedown', parent.cp_widget.hidePanel, { once: true } );
			document.addEventListener( 'mousedown', parent.cp_widget.hidePanel );
		} );

		//modify cursor on hover and shift-hold to indicate deletePoint functionality
		handle.addEventListener( 'mousemove', function( e ) {
			if ( e.shiftKey ) {
				handle.addClass( 'deleteCursor' );
			}
		} );

		//remove cursor on mouseout
		handle.addEventListener( 'mouseleave', function() {
			handle.removeClass( 'deleteCursor' );
		} );

		function showContextMenu( e ) {
			var mouse = UI.getRelativePosition( e.clientX, e.clientY, container );

			var colorScheme = self.options.colorScheme || 'dark';
			var handleContextMenu = new ContextMenu( { container: container, colorScheme: colorScheme } );
			var menuItems = [
				{ name: 'Remove point', callback: function() {
					self.deleteControlPoint( controlPoint );
					updateWidgetBound();
				} }
			];
			handleContextMenu.addItems( menuItems );
			handleContextMenu.showAt( mouse.x, mouse.y );

			document.addEventListener( 'mousedown', handleContextMenu.destroyMenu );
			//document.addEventListener( 'mousedown', handleContextMenu.destroyMenu, { once: true } );

			//disable default context menu
			e.preventDefault();
			e.stopPropagation();
			return false;
		}
		handle.addEventListener( 'contextmenu', showContextMenu );

		controlPoint.handle = handle;
		this.controlPoints.addPoint( controlPoint );
	};

	TF_widget.prototype.updateControlPoint = function( controlPoint, params ) {
		if( typeof controlPoint !== 'object' ) {
			controlPoint = this.findControlPoint( controlPoint );
		}

		if( params === undefined ) {
			params = {};
			params.value = controlPoint.value;
			params.alpha = controlPoint.alpha;
		}
		//update position of svg
		if( params.x ) {
			//restrict x coordinate to [ 0, width ]
			//x = Math.clamp( x, 0, this.parent.width );
			controlPoint.value = params.x / this.parent.width;
		}
		if( params.y ) {
			//restrict y coordinate to [ 0, height ]
			//y = Math.clamp( y, 0, this.parent.height );
			controlPoint.alpha = 1.0 - ( params.y / this.parent.height );
		}

		if( params.value ) {
			controlPoint.value = params.value;
			if( !params.x ) params.x = controlPoint.value * this.parent.width;
		}

		if( params.alpha ) {
			controlPoint.alpha = params.alpha;
			if( !params.y ) params.y = ( 1.0 - controlPoint.alpha ) * this.parent.height;
		}

		controlPoint.handle.set( params.x, params.y );
	};

	TF_widget.prototype.findControlPoint = function( value, remove ) {
		if( remove === undefined ) remove = false;
		var index = null;
		for ( var i = 0; i < this.controlPoints.length; i++ ) {
			if ( this.controlPoints[ i ].value == value ) {
				index = i;
			}
		}
		//var index = this.controlPoints.findIndex( function( point ) { return point.value === value; } );
		if ( index === null ) {
			return null;
		}
		if( remove ) {
			this.controlPoints.splice( index, 1 );
			return null;
		} else {
			return this.controlPoints[ index ];
		}
	};

	TF_widget.prototype.deleteControlPoint = function( controlPoint ) {
		this.parent.svgContext.removeChild( controlPoint.handle );

		this.findControlPoint( controlPoint.value, true );
	};

	/**
	 * find the two controlPoints that the specified value lies inbetween
	 */
	TF_widget.prototype.findNeighborControlPoints = function( value ) {
		var right = null, left = null;
		var leftValue = Number.MIN_VALUE, rightValue = Number.MAX_VALUE;
		for( var index = 0; index < this.controlPoints.length; index++ ) {
			var controlPoint = this.controlPoints[ index ];
			if( controlPoint.value < value && controlPoint.value > leftValue ) leftValue = controlPoint.value;
			if( controlPoint.value > value && controlPoint.value < rightValue ) rightValue = controlPoint.value;
		}
		if( leftValue > Number.MIN_VALUE ) left = this.findControlPoint( leftValue );
		if( rightValue < Number.MAX_VALUE ) right = this.findControlPoint( rightValue );
		return { left: left, right: right };
	};
	/**
	 * find position of anchor point under TF_widget curve and move anchor handle to appropriate position
	 */
	TF_widget.prototype.updateAnchor = function() {
		var controlPoints = this.controlPoints;

		var startValue = controlPoints[ 0 ].value,
			endValue = controlPoints[ controlPoints.length - 1 ].value;

		var anchorValue = startValue + ( endValue - startValue ) / 2;

		//find two controlPoints that anchor lies underneath
		var neighbors = this.findNeighborControlPoints( anchorValue ),
			left = neighbors.left,
			right = neighbors.right;

		if( !left ) {
			left = { alpha: 0, value: anchorValue };
		}
		if( !right ) {
			right = { alpha: 0, value: anchorValue };
		}

		var anchorAlpha = ( left.alpha + ( right.alpha - left.alpha ) * ( anchorValue - left.value ) / ( right.value - left.value ) ) / 2;
		var w = this.anchor.data.width,
			h = this.anchor.data.height;
		var x = anchorValue * this.canvas.width - ( w / 2 ),
			y = this.canvas.height - anchorAlpha * this.canvas.height - ( h / 2 );
		this.anchor.set( x, y );
	};

	TF_widget.prototype.updateWidget = function( sort ) {
		if( sort === undefined ) sort = true;
		//sort controlPoints by ascending value
		var controlPoints = this.controlPoints;
		if ( sort ) controlPoints.sortPoints();

		this.updateHandles();
		this.updateAnchor();

		//redraw
		this.drawWidget();
	};

	TF_widget.prototype.updateHandles = function() {
		this.outline.setPoints( this.controlPoints );

		var leftPoint = this.controlPoints[ 0 ];
		var rightPoint = this.controlPoints[ this.controlPoints.length - 1 ];
		this.handles.left.setPoint( { x: leftPoint.value, y: leftPoint.alpha } );
		this.handles.right.setPoint( { x: rightPoint.value, y: rightPoint.alpha } );
	};

	/**
	 * create polygon path for widget tracing positions of controlpoints
	 * create gradient and draw polygon
	 */
	TF_widget.prototype.drawWidget = function( notifyCallback ) {
		notifyCallback = notifyCallback || true;
		var controlPoints = this.controlPoints;
		var canvas = this.canvas;

		var start = controlPoints[ 0 ].value;
		var end = controlPoints[ controlPoints.length - 1 ].value;
		var gradientStart = Math.min( start, end );
		var gradientEnd = Math.max( start, end );

		var context = canvas.getContext( '2d' );

		context.clearRect( 0, 0, canvas.width, canvas.height );
		context.beginPath();
		context.moveTo( start * canvas.width, canvas.height );

		var widgetWidth = Math.abs( end - start );
		var gradient = context.createLinearGradient( gradientStart * canvas.width, 0, gradientEnd * canvas.width, 0 ); //horizontal gradient

		for( var index = 0; index < controlPoints.length; index++ ) {
			var controlPoint = controlPoints[ index ];
			//draw line
			context.lineTo( controlPoint.value * canvas.width, canvas.height - controlPoint.alpha * canvas.height );
			//add gradient stop
			var stopPos = Math.clamp( controlPoint.value - gradientStart, 0, 1 ) / widgetWidth;

			//create color string with or without alpha value depending on settings
			var rgbaColorString = 'rgba( ' + controlPoint.color.r + ', ' + controlPoint.color.g + ', ' + controlPoint.color.b + ', ' + ( this.options.gradientAlpha ? controlPoint.alpha : '1' ) + ')';

			gradient.addColorStop( stopPos, rgbaColorString );
		}

		context.lineTo( end * canvas.width, canvas.height );
		context.lineTo( start * canvas.width, canvas.height );

		context.closePath();

		context.fillStyle = gradient;
		context.fill();

		if( notifyCallback ) {
			this.fireChange();
		}
		//propagate change to callbacks
	};

	var ContextMenu = function( options ) {
		if( options === undefined ) options = {};
		var container = options.container || document.body;
		this.container = container;
		var panel = new Panel( { container: container } );
		panel.addClass( 'menu' );
		panel.addClass( 'popup' );
		panel.addClass( options.colorScheme );

		var itemsContainer = document.createElement( 'ul' );
		panel.dom.appendChild( itemsContainer );
		panel.moveTo( 0, 0 );

		this.itemsContainer = itemsContainer;

		this.folders = [];

		this.panel = panel;
		this.hideMenu = this.hide.bind( this );
		this.destroyMenu = this.destructor.bind( this );
	};

	ContextMenu.prototype.destructor = function() {
		if( this.container.contains( this.panel.dom ) ) {
			this.container.removeChild( this.panel.dom );
		}
	};

	ContextMenu.prototype.addItems = function( items ) {
		for( var index = 0; index < items.length; index++ ) {
			var item = items[ index ];
			this.addItem( item );
		}
	};

	/**
	 * accepts four parameters or one object containing four params
	 */
	ContextMenu.prototype.addItem = function( name, callback, folder, colors ) {
		if( folder === undefined ) folder = null;
		if( colors === undefined ) colors = null;
		if( typeof name === 'object' ) {
			colors = name.colors;
			folder = name.folder;
			callback = name.callback;
			name = name.name;
		}
		var item = document.createElement( 'li' );
		item.id = name;
		item.setAttribute( 'class', colors ? 'gradient' : 'text' );
		item.onmousedown = function( e ) {
			e.preventDefault();
			callback( e );
		};

		var link = document.createElement( 'span' );
		link.innerHTML = name;

		item.appendChild( link );

		if( colors ) {
			var gradientCanvas = document.createElement( 'canvas' );
			gradientCanvas.width = 200;
			gradientCanvas.height = 24;

			link.style.color = '#fff';
			link.style.textShadow = '1px 0px #aaa';

			item.style.height = gradientCanvas.height + 'px';
			item.style.width = gradientCanvas.width + 'px';
			item.style.margin = '3px 0px';
			//item.style.background = 'linear-gradient(to right, ' + colors.join() + ')';

			gradientCanvas.setAttribute( 'style',
				'z-index: -10;' +
				'position: relative;' +
				'margin: 0;' +
				'padding: 0;' +
				'top: -' + gradientCanvas.height + 'px;' +
				'left: 0;' +
				'height: ' + gradientCanvas.height + 'px;' +
				'width: ' + gradientCanvas.width + 'px;' );

			item.appendChild( gradientCanvas );
			var gradientContext = gradientCanvas.getContext( '2d' );

			var gradient = gradientContext.createLinearGradient( 0, 0, gradientCanvas.width, 0 ); //horizontal gradient
			for( var index = 0; index < colors.length; index++ ) {
				gradient.addColorStop( index / colors.length, colors[ index ] );
			}
			gradientContext.fillStyle = gradient;
			gradientContext.fillRect( 0, 0, gradientCanvas.width, gradientCanvas.height );
		}

		var parent = this.itemsContainer;

		//if( folder && this.folders.find( getFolder ) ) parent = this.folders.find( getFolder )[ 1 ];
		if( folder ) {
			for( var index = 0; index < this.folders.length; index++ ) {
				if( this.folders[ index ][ 0 ] === folder ) {
					parent = this.folders[ index ][ 1 ];
					break;
				}
			}
		}
		parent.appendChild( item );
	};

	ContextMenu.prototype.addFolder = function( name ) {
		var folder = document.createElement( 'li' );
		folder.id = name;
		folder.setAttribute( 'class', 'folder text' );

		var link = document.createElement( 'span' );
		link.innerHTML = name;
		folder.appendChild( link );

		var itemsSubContainer = document.createElement( 'ul' );
		itemsSubContainer.setAttribute( 'class', 'subMenu' );
		itemsSubContainer.id = name + 'SubMenu';
		folder.appendChild( itemsSubContainer );

		this.itemsContainer.appendChild( folder );
		this.folders.push( [ name, itemsSubContainer ] );
	};

	ContextMenu.prototype.showAt = function( x, y ) {
		x = Math.min( x, this.container.clientWidth - this.panel.dom.clientWidth - 10 );
		y = Math.min( y, this.container.clientHeight - this.panel.dom.clientHeight - 10 );

		this.panel.moveTo( x, y );

		this.panel.show();
	};

	ContextMenu.prototype.hide = function() {
		this.panel.hide();
	};
