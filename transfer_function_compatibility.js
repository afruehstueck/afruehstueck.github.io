/**
 * @author afruehstueck
 */

/**
 * convenience function (added to Math) for restricting range of a value
 * @param value			input value to be clamped
 * @param min			minimum output value
 * @param max			maximum output value
 * @returns {number}	clamped value
 */
Math.clamp = function( value, min, max ) { return Math.min( Math.max( min, value ), max ); };

/**
 * interpolate between array elements in arrays a and b
 * t is percentage of a in interpolation
 */
Math.interpolate = function( a, b, t ) {
	return a.map( function( _, i ) {
		return a[ i ] * ( 1 - t ) + b[ i ] * t;
	} );
}

/**
 * class containing UI-related functionality
 */
var UI = function() {};

UI.getRelativePosition = function( x, y, elem ) {
	return {
		x: x ? x - Math.floor( elem.getBoundingClientRect().left ) : null,
		y: y ? y - Math.floor( elem.getBoundingClientRect().top ) : null
	};
};

/* display spinning loading icon */
UI.loading = function( container ) {
	container = container || document.body;

	var loading = document.getElementById( 'loading' );
	if( !loading ) {
		loading = document.createElement( 'div' );
		loading.id = 'loading';

		container.appendChild( loading );
		var spinner = document.createElement( 'div' );
		loading.appendChild( spinner );
	}
	loading.style.visibility = 'visible';
};

/* hide spinning loading icon */
UI.finishedLoading = function() {
	var loading = document.getElementById( 'loading' );
	if( loading ) {
		loading.style.visibility = 'hidden';
	}
};


/**
 * UI element - eventually replace with Steve's UI class
 */
var Panel = function( options ) {
	options = options || {};
	var dom = document.createElement( 'div' );
	dom.className = 'panel';
	options.container = options.container || document.body;
	options.container.appendChild( dom );
	this.dom = dom;
};

Panel.prototype.toggle = function() {
	this.dom.style.visibility = ( this.dom.style.visibility === 'hidden' ) ? 'visible' : 'hidden';
};

Panel.prototype.hide = function() {
	console.log( 'hide' );
	this.dom.style.visibility = 'hidden';
}

Panel.prototype.show = function() {
	this.dom.style.visibility = 'visible';
}

/**
 * helper class for creating SVG elements
 */
var SVG = function() {};

/**
 * set x- and y position for SVG elements
 * also writes x- and y position to element.data.*
 */
SVG.set = function( x, y ) {
	if( x ) {
		this.setAttribute( ( this.tagName === 'circle' ) ? 'cx' : 'x', x );
		this.data.x = x;
	}
	if( y ) {
		this.setAttribute( ( this.tagName === 'circle' ) ? 'cy' : 'y', y );
		this.data.y = y;
	}
};

/**
 * sets fill color of SVG element
 */
SVG.setFillColor = function( color ) {
	this.setAttribute( 'fill', color );
};

/**
 * sets line color of SVG element
 */
SVG.setLineColor = function( color ) {
	this.setAttribute( 'stroke', color );
};

/**
 * create an SVG circle
 * @param parent		DOM element the SVG will be appended to
 * @param cx			x-coordinate of circle
 * @param cy			y-coordinate of circle
 * @param fillColor		fill color of circle
 * @param r				radius of circle
 * @param strokeColor	stroke color of circle
 * @param strokeWidth	width of stroke of circle
 * @returns {Element}	returns created circle SVG element, appended to parent
 */
SVG.createCircle = function( parent, cx, cy, fillColor, r, strokeColor, strokeWidth ) {
	fillColor = fillColor || 'none';
	r = r || 7;
	strokeColor = strokeColor || '#aaa';
	strokeWidth = strokeWidth || '2px';
	var circle = document.createElementNS( SVG.svgNS, 'circle' );

	circle.setAttribute( 'class', 'circle' );
	circle.setAttribute( 'cx', cx );
	circle.setAttribute( 'cy', cy );
	circle.setAttribute( 'r', r );
	circle.setAttribute( 'fill', fillColor );
	circle.setAttribute( 'stroke', strokeColor );
	circle.setAttribute( 'stroke-width', strokeWidth );

	//write x, y and r to a data object in order to make these parameters easily accessible from outside
	circle.data = {};
	circle.data.x = cx;
	circle.data.y = cy;
	circle.data.r = r;

	circle.set = this.set;
	circle.setFillColor = this.setFillColor;
	circle.setLineColor = this.setLineColor;

	if( parent ) {
		circle.parent = parent;
		circle.parent.appendChild( circle );
	}
	return circle;
};

/**
 * create an SVG rectangle
 * @param parent		DOM element the SVG will be appended to
 * @param x				x-coordinate of rectangle
 * @param y				y-coordinate of rectangle
 * @param fillColor		fill color of rectangle
 * @param w				width of rectangle
 * @param h				height of rectangle
 * @param strokeColor	stroke color of rectangle
 * @param strokeWidth	stroke width of rectangle
 * @returns {Element}	returns created rectangle SVG element, appended to parent
 */
SVG.createRect  = function( parent, x, y, fillColor, w, h, strokeColor, strokeWidth ) {
	fillColor = fillColor || 'black';
	w = w || 12;
	h = h || 12;
	strokeColor = strokeColor || '#aaa';
	strokeWidth = strokeWidth || '2px';
	var rect = document.createElementNS( SVG.svgNS, 'rect' );
	rect.setAttribute( 'class', 'rect' );
	rect.setAttribute( 'x', x );
	rect.setAttribute( 'y', y );
	rect.setAttribute( 'width', w );
	rect.setAttribute( 'height', h );
	rect.setAttribute( 'fill', fillColor );
	rect.setAttribute( 'stroke', strokeColor );
	rect.setAttribute( 'stroke-width', strokeWidth );

	rect.data = {};
	rect.data.x = x;
	rect.data.y = y;
	rect.data.width = w;
	rect.data.height = h;

	rect.set = this.set;
	rect.setFillColor = this.setFillColor;
	rect.setLineColor = this.setLineColor;

	if( parent ) {
		rect.parent = parent;
		rect.parent.appendChild( rect );
	}
	return rect;
};

/**
 *  create an SVG Polyline
 *
 * accepts an array of point objects where attrX and and attrY denotes the key to the x and y components within the point object
 * (e.g. points = [ { value: 0.6, alpha: 0.2 }, { value: 0.9, alpha: 0.5 } ] where attrX = 'value' and attrY = 'alpha' OR
 * (e.g. points = [ { x: 0.6, y: 0.2 }, { x: 0.9, y: 0.5 } ] where attrX = 'x' and attrY = 'y'
 * width and height allow the point values to be scaled to the range of the parent element
 *
 * @param parent		DOM element the SVG will be appended to
 * @param points		array of objects containing point information
 * @param scaleWidth	optional scale factor by which the x-location will be multiplied
 * @param scaleHeight	optional scale factor by which the y-location will be multiplied
 * @param attrX			name of x-Attribute in point object array
 * @param attrY			name of y-Attribute in point object array
 * @param invertY		invert Y values for normalized y-values (use 1 - y instead of y)
 * @param fillColor		fill color of polyline (fills convex areas in polyline
 * @param strokeColor	stroke color of polyline
 * @param strokeWidth	stroke width of polyline
 * @returns {Element}	returns created polyline SVG element, appended to parent
 */
SVG.createPolyline  = function( parent, points, scaleWidth, scaleHeight, attrX, attrY, invertY, fillColor, strokeColor, strokeWidth ) {
	scaleWidth = scaleWidth || 1;
	scaleHeight = scaleHeight || 1;
	attrX = attrX || 'x';
	attrY = attrY || 'y';
	invertY = invertY || true;
	fillColor = fillColor || 'none';
	strokeColor = strokeColor || '#eee';
	strokeWidth = strokeWidth || '3px';
	var polyline = document.createElementNS( SVG.svgNS, 'polyline' );
	polyline.setAttribute( 'class', 'line' );
	if( points ) {
		polyline.setAttribute( 'points', pointsToString( points, scaleWidth, scaleHeight ) );
	}
	polyline.setAttribute( 'fill', fillColor );
	polyline.setAttribute( 'stroke', strokeColor );
	polyline.setAttribute( 'stroke-width', strokeWidth );

	polyline.data = {};
	polyline.data.points = points;

	function pointsToString( points ) {
		var pointString = '';
		for( var index = 0; index < points.length; index++ ) {
			var point = points[ index ];
			pointString += point[ attrX ] * scaleWidth + ',' + ( invertY ? ( 1 - point[ attrY ] ) : point[ attrY ] ) * scaleHeight + ' ';
		}
		return pointString;
	}

	function setPoints( points ) {
		this.setAttribute( 'points', pointsToString( points ) );
		this.data.points = points;
	}

	polyline.setPoints = setPoints;
	polyline.setFillColor = this.setFillColor;
	polyline.setLineColor = this.setLineColor;

	if( parent ) {
		polyline.parent = parent;
		polyline.parent.appendChild( polyline );
	}
	return polyline;
};


SVG.createLine = function( parent, points, scaleWidth, scaleHeight, invertY, stroke, strokeWidth ) {
	scaleWidth = scaleWidth || 1;
	scaleHeight = scaleHeight || 1;
	invertY = invertY || true;
	stroke = stroke || '#eee';
	strokeWidth = strokeWidth || '3px';
	var line = document.createElementNS( SVG.svgNS, 'line' );
	line.setAttribute( 'class', 'line' );
	if( points ) {
		line.setPoints( points );
	}
	line.setAttribute( 'stroke', stroke );
	line.setAttribute( 'stroke-width', strokeWidth );

	line.data = {};
	line.data.points = [];

	function setPoints( points ) {
		this.setAttribute( 'x1', String( points[ 0 ].x * scaleWidth ) );
		this.setAttribute( 'y1', String( ( invertY ? ( 1 - points[ 0 ].y ) : points[ 0 ].y ) * scaleHeight ) );
		this.setAttribute( 'x2', String( points[ 1 ].x * scaleWidth ) );
		this.setAttribute( 'y2', String( ( invertY ? ( 1 - points[ 1 ].y ) : points[ 1 ].y ) * scaleHeight ) );
		this.data.points = points;
	}

	line.setPoints = setPoints;
	line.setFillColor = this.setFillColor;
	line.setLineColor = this.setLineColor;

	line.parent = parent;
	line.parent.appendChild( line );
	return line;
};

SVG.svgNS = 'http://www.w3.org/2000/svg';
/**
 * Color operates in two color spaces: HSV and RGB
 * HSV colors are in a { hue ∈ [ 0, 1 ], saturation ∈ [ 0, 1 ], value ∈ [ 0, 1 ] } domain
 * RGB colors are in a { red ∈ [ 0, 255 ], green ∈ [ 0, 255 ], blue ∈ [ 0, 255 ] } domain
 */
var Color = function() {
	this.rgb = { r: 0, g: 0, b: 0 };
	this.hsv = { h: 0, s: 0, v: 0 };

	this.callbacks = [];

	this.set( this.rgb, null );
};

/**
 * attach a callback function to color object
 * owner is the element the function is contained in
 * callback is the actual callback function
 */
Color.prototype.registerCallback = function( owner, callback ) {
	if ( this.callbacks.indexOf( { owner: owner, callback: callback } ) < 0 ) {
		this.callbacks.push( { owner: owner, callback: callback } );
	}
};

/**
 * remove callbacks owned by owner
 */
Color.prototype.removeCallback = function( owner ) {
	for( var i = 0; i < this.callbacks.length; i++ ) {
		if( this.callbacks[ i ].owner === owner ) {
			this.callbacks.splice( i, 1 );
		}
	}
};

/**
 * fires all registered callback functions
 */
Color.prototype.fireChange = function( caller ) {
	caller = caller || null;
	for( var index = 0; index < this.callbacks.length; index++ ) {
		var callbackObject = this.callbacks[ index ];
		var owner = callbackObject.owner;
		var callback = callbackObject.callback;
		if( owner !== caller ) {
			callback( this );
		}
	}
};

/**
 * value is an object containing key, value pairs specifying new color values, either in rgb or hsv
 * components may be missing
 * e.g. { r: 255, g: 0, b: 120 } or { r: 255 } or { s: 1, v: 0 }
 *
 * caller may be passed to identify the element that triggered the change
 * (in order to not fire the change event back to that element)
 */
Color.prototype.set = function( col, caller ) {
	caller = caller || null;
	col = Color.parseColor( col );
	//check keys in col object
	var vars = Object.keys( col ).join( '' );
	//test if string of keys contain 'rgb' or 'hsv'
	var setRGB = /[rgb]/i.test( vars );
	var setHSV = /[hsv]/i.test( vars );

	if( vars.length == 0 || setRGB === setHSV ) {
		console.err( 'invalid params in color setter: cannot assign' );
		return;
	}

	var self = this;
	//assign each component to the respective color parameter
	Object.keys( col ).forEach( function ( key ) {
		if( setRGB ) 		self.rgb[ key ] = col[ key ];
		else if( setHSV )	self.hsv[ key ] = col[ key ];
	} );

	//update the color space value not assigned through the setter
	if( setRGB ) 		this.hsv = Color.RGBtoHSV( this.rgb );
	else if( setHSV )	this.rgb = Color.HSVtoRGB( this.hsv );

	//notify all attached callbacks
	this.fireChange( caller );
};

Color.prototype.getRGB = function() {
	return this.rgb;
};

Color.prototype.getHSV = function() {
	return this.hsv;
};

Color.RGB = function( x, y, z ) {
	return { r: x, g: y, b: z };
};

Color.HSV = function( x, y, z ) {
	return { h: x, s: y, v: z };
};

/**
 * parses an unknown input color value
 * can be HEX = #FFFFFF or #FFF, RGB = rgb( 255, 255, 255 ) or color object
 * returns RGB object for parsed strings or the original object for color objects
 */
Color.parseColor = function( col ) {
	if( col === null ) return null;
	//check if color is a string, otherwise do conversion to color object
	if( typeof col === 'string' ) {
		//HEX
		if( col.startsWith( '#' ) ) {
			return Color.HEXtoRGB( col );
			//RGB(A) (would discard alpha value)
		} else if( col.startsWith( 'rgb' ) ) {
			var parsedNumbers = col.match( /^\d+|\d+\b|\d+(?=\w)/g ).map( function ( v ) { return +v; } );
			if( parsedNumbers.length < 3 ) {
				console.err( 'tried to assign invalid color ' + col );
				return;
			}
			return RGB( parsedNumbers[ 0 ], parsedNumbers[ 1 ], parsedNumbers[ 2 ] );
		}
	} else if( typeof col === 'object' ) {
		return col;
		/*//check keys in col object
		 var vars = Object.keys( col ).join( '' );
		 //test if string of keys contain 'rgb' or 'hsv'
		 var isRGB = vars.includes( r ) && vars.includes( g ) && vars.includes( b );
		 var isHSV = vars.includes( h ) && vars.includes( s ) && vars.includes( v );

		 if( vars.length == 0 || isRGB === isHSV ) {
		 console.err( 'could not parse color, invalid keys ' + vars + ' in passed color object' );
		 return null;
		 }

		 if( isRGB ) 		return col;
		 else if( isHSV )	return Color.HSVtoRGB( col );*/
	}
};

/**
 * accepts parameters { r: x, g: y, b: z } OR r, g, b
 */
Color.RGBtoHEX = function( r, g, b ) {
	if ( arguments.length === 1 ) {
		g = r.g;
		b = r.b;
		r = r.r;
	}
	//round to nearest integers
	r = Math.round( r );
	g = Math.round( g );
	b = Math.round( b );

	return '#' + ( ( 1 << 24 ) + ( r << 16 ) + ( g << 8 ) + b ).toString( 16 ).slice( 1 );
};
/**
 * convert HEX color to RGB
 * from http://stackoverflow.com/a/5624139
 * accepts parameter #ffffff or #fff (shorthand hex)
 */
Color.HEXtoRGB = function( hex ) {
	// Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
	var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
	hex = hex.replace(shorthandRegex, function(m, r, g, b) {
		return r + r + g + g + b + b;
	});

	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? this.RGB( parseInt( result[ 1 ], 16 ), parseInt( result[ 2 ], 16 ), parseInt( result[ 3 ], 16 ) ) : null;
};

/**
 * convert HSV color to RGB
 * from http://stackoverflow.com/a/17243070
 * accepts parameters { h: x, s: y, v: z } OR h, s, v
 */
Color.HSVtoRGB = function( h, s, v ) {
	var r, g, b, i, f, p, q, t;
	if ( arguments.length === 1 ) {
		s = h.s, v = h.v, h = h.h;
	}
	i = Math.floor( h * 6 );
	f = h * 6 - i;
	p = v * ( 1 - s );
	q = v * ( 1 - f * s );
	t = v * ( 1 - ( 1 - f ) * s );
	switch ( i % 6 ) {
		case 0: r = v, g = t, b = p; break;
		case 1: r = q, g = v, b = p; break;
		case 2: r = p, g = v, b = t; break;
		case 3: r = p, g = q, b = v; break;
		case 4: r = t, g = p, b = v; break;
		case 5: r = v, g = p, b = q; break;
	}
	return this.RGB( Math.round( r * 255 ), Math.round( g * 255 ), Math.round( b * 255 ) );
};

/**
 * convert RGB color to HSV
 * from http://stackoverflow.com/a/17243070
 * accepts parameters { r: x, g: y, b: z } OR r, g, b
 */
Color.RGBtoHSV = function( r, g, b ) {
	if ( arguments.length === 1 ) {
		g = r.g, b = r.b, r = r.r;
	}
	var max = Math.max( r, g, b ), min = Math.min( r, g, b ),
		d = max - min,
		h,
		s = ( max === 0 ? 0 : d / max ),
		v = max / 255;

	switch ( max ) {
		case min: h = 0; break;
		case r: h = ( g - b ) + d * ( g < b ? 6: 0 ); h /= 6 * d; break;
		case g: h = ( b - r ) + d * 2; h /= 6 * d; break;
		case b: h = ( r - g ) + d * 4; h /= 6 * d; break;
	}

	return this.HSV( h, s, v );
};


/**
 * TF_panel is the base class for the transfer function panel
 * contains the container DIV (panel), the histogram canvas, one or multiple TF_widgets, the SVG context for UI elements
 */
var TF_panel = function( parent, options ) {
	options = options || {};
	var self = this;
	this.parent = parent;

/*
	options = '{"panel":			{	"width":			600,' +
			  '							"height":			140	},' +
			  '	"statistics":		{	"numBins":			140	},' +
			  '	"histogram":		{	"backgroundColor":	"#000000",' +
			  '							"fillColor":		"#333333",' +
			  '							"lineColor":		"#666666",' +
			  '							"style":			"polygon",
										"overlayUnscaled":	true },
				"gradientPresets":	{	"defaultPresets":	true,
										"presets":			[ 	{"name":	"Magma",	"colors":	["#000004","#3b0f70","#8c2981","#de4968","#fea16e","#fcfdbf"]},
																{"name":	"Inferno",	"colors":	["#000004","#420a68","#932667","#dd513a","#fbbc21","#fcffa4"]},
																{"name":	"Plasma",	"colors":	["#0d0887","#6a00a8","#b12a90","#e16462","#fca835","#f0f921"]},
																{"name":	"Viridis",	"colors":	["#440154","#414487","#2a788e","#22a884","#7cd250","#fde725"]},
																{"name":	"Greyscale","colors":	["#000000","#888888","#ffffff"]}	]	},
				"widgets":			[	{"controlPoints":	[	{"value":0.5793333333333334,"alpha":0.18833333333333335,"color":"#440154"},
																{"value":0.6393333333333334,"alpha":0.28833333333333333,"color":"#414487"},
																{"value":0.6993333333333334,"alpha":0.3883333333333333,"color":"#2a788e"},
																{"value":0.7593333333333333,"alpha":0.4883333333333333,"color":"#22a884"},
																{"value":0.8193333333333334,"alpha":0.5883333333333334,"color":"#7cd250"},
																{"value":0.8793333333333333,"alpha":0.6883333333333334,"color":"#fde725"}	]	},
										{"controlPoints":	[	{"value":0.15399999999999997,"alpha":0.11499999999999999,"color":"#000004"},
																{"value":0.214,"alpha":0.21499999999999997,"color":"#420a68"},
																{"value":0.27399999999999997,"alpha":0.31499999999999995,"color":"#932667"},
																{"value":0.334,"alpha":0.41500000000000004,"color":"#dd513a"},
																{"value":0.3939999999999999,"alpha":0.515,"color":"#fbbc21"},
																{"value":0.454,"alpha":0.615,"color":"#fcffa4"}	]	}	],
				"colorpicker":		{	"svPicker":			{	"size":128,
																"cursorRadius":3	},
										"hPicker":			{	"width":25,
																"height":128,
																"pad":4,
																"cursorHeight":4}	}	}';
*/

	this.options = this.parseOptions( options );

	this.callbacks = [];

	//parent dom element of TF panel
	var panel = new Panel( { container: options.container || parent.parentElement } );

	panel.dom.id = 'tf-panel';
	panel.dom.classList.add( 'overlay' );
	this.panel = panel;
	panel.width = this.options.panel.width;
	panel.height = this.options.panel.height;

	//canvas for drawing background histogram
	var canvas = document.createElement( 'canvas' );
	canvas.width = panel.width;
	canvas.height = panel.height;
	canvas.id = 'histogram-canvas';
	this.panel.dom.appendChild( canvas );
	this.canvas = canvas;
	this.canvas.getContext( '2d' ).fillStyle = options.backgroundColor;
	this.canvas.getContext( '2d' ).fillRect( 0, 0, canvas.width, canvas.height );

	this.panelContextMenu = this.addContextMenu( this.options.gradientPresets );

	this.updateHistogram = false;

	//create SVG context for interaction elements
	var svgContext = document.createElementNS( SVG.svgNS, 'svg' );
	svgContext.setAttribute( 'xmlns', SVG.svgNS );
	svgContext.setAttribute( 'xmlns:xlink', 'http://www.w3.org/1999/xlink' );
	svgContext.setAttribute( 'width', panel.width );
	svgContext.setAttribute( 'height', panel.height );
	svgContext.setAttribute( 'id', 'tf-svg' );
	svgContext.setAttribute( 'class', 'overlay' );
	svgContext.setAttribute( 'z-index', 100 );
	this.panel.svgContext = svgContext;
	this.panel.dom.appendChild( svgContext );

	//small indicator for histogram tracing
	this.histogramHover = SVG.createCircle( svgContext, 0, 0, 'none', 4, '#666' );
	this.histogramHover.setAttribute( 'visibility', 'hidden' );
	this.histogramHover.className = 'tooltip';

	//tooltip for displaying value of histogram trace
	this.histogramTooltip = document.createElement( 'div' );
	this.histogramTooltip.className = 'tooltip';
	this.panel.dom.appendChild( this.histogramTooltip );
	
	//show tooltips on hover over tf panel
	svgContext.addEventListener( 'mousemove', function( e ) {
		if( !self.statistics ) return;
		var binWidth = self.canvas.width / self.statistics.numBins;
		var bin = Math.floor( e.pageX / binWidth );

		var xHover = e.pageX;

		var yHover = self.canvas.height - self.canvas.height * self.histogramScale( self.statistics.histogram[ bin ] ) / self.histogramScale( self.statistics.maxBinValue );
		if( yHover === Infinity ) yHover = self.canvas.height;

		self.histogramHover.setAttribute( 'cx', xHover );
		self.histogramHover.setAttribute( 'cy', yHover );

		self.histogramTooltip.innerHTML = 'value: ' + Math.floor( ( e.pageX / self.canvas.width ) * 255 ) + '<br>' + 'count: ' + self.statistics.histogram[ bin ];
		self.histogramTooltip.style.left = xHover + 'px';
		self.histogramTooltip.style.top = yHover + 'px';
	}.bind( self ), true );

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
	this.options.colorpicker.container = this.panel.dom;
	var cp_widget = new CP_widget( this.options.colorpicker );
	panel.cp_widget = cp_widget;

	this.draw();
};

TF_panel.prototype.parseOptions = function( options ){
	if( typeof options === 'string' ) {
		options = JSON.parse( options );
	}
	/** panel appearance options
	 * width:			number 				width of histogram panel
	 * height: 			number
	 */
	options.panel = options.panel || {};
	options.panel.width = options.panel.width || 500;
	options.panel.height = options.panel.height || 100;

	/** histogram calculation options
	 * numBins:			number				denotes the number of bins for the histogram calculation
	 */
	options.statistics = options.statistics || {};
	options.statistics.numBins = options.statistics.numBins || ( options.panel.width / 5 );

	/** histogram style options
	 * backgroundColor:	color				background color for the histogram background
	 * fillColor:		color				fill color for the histogram drawing
	 * lineColor:		color				line color for the histogram drawing
	 * style:			'polygon' or 'bars'	whether the histogram should be plotted as a polyline or vertical rectangular bars
	 * scale:			function			(mathematical) function by which the histogram values should be scaled (e.g. logarithmic, ...)
	 * overlayUnscaled:	boolean				whether the histogram (scaled by the 'scale' function should be overlayed with an unscaled version
	 */
	options.histogram = options.histogram || {};
	options.histogram.backgroundColor = options.histogram.backgroundColor || '#000000';
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
			{ name: 'Greyscale',	colors: [ '#000000', '#888888', '#ffffff' ] }
		];
	options.gradientPresets = options.gradientPresets || {};
	if( options.gradientPresets.defaultPresets === undefined ) options.gradientPresets.defaultPresets = true;
	options.gradientPresets.presets = options.gradientPresets.presets || [];
	if( options.gradientPresets.defaultPresets || options.gradientPresets.presets.length === 0 ) {
		options.gradientPresets.presets = options.gradientPresets.presets.concat( defaultPresets );
	}

	/** array of widget options:
	 * location:		number
	 * controlPoints:	array of { value: number, alpha: number, color: color }
	 * opacity:			number
	 * colors:			array of color values
	 */
	options.widgets = options.widgets || [];
	for( var index = 0; index < options.widgets.length; index++ ) {
		options.widgets[ index ] = options.widgets[ index ] || {};
		options.widgets[ index ].location = options.widgets[ index ].location || 0.5;
		options.widgets[ index ].controlPoints = options.widgets[ index ].controlPoints || [];
		options.widgets[ index ].opacity = options.widgets[ index ].opacity || 0.6;
	}

	/** colorpicker options
	 * options.svPicker.*:			saturation/value pickerrectangle
	 * size:			number		size of rectangle
	 * cursorRadius:	number		radius of colorpicker cursor
	 *
	 * options.hPicker.*:			hue picker rectangle
	 * width:			number		width of hue picker
	 * cursorHeight:	number		height of hue picker cursor
	 * pad:			number		padding between sv picker and hue picker
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

/**
 *
 */
TF_panel.prototype.addContextMenu = function( options ) {
	options = options || {};
	var self = this;
	var panelContextMenu = new ContextMenu();

	var folderName = 'Add widget';
	panelContextMenu.addFolder( folderName );

	function createGradientPresetObject( name, colors ) {
		return {
			name: name,
			folder: folderName,
			colors: colors,
			callback: function( e ) {
				var mouse = UI.getRelativePosition( e.clientX, e.clientY, self.panel.dom );
				self.addWidget( { location: mouse.x / self.panel.width, colors: colors } );
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
		self.panelContextMenu.showAt( e.clientX, e.clientY );

		document.addEventListener( 'mousedown', self.panelContextMenu.hidePanel, { once: true } );

		//disable default context menu
		e.preventDefault();
		e.stopPropagation();
		return false;
	}

	this.panel.dom.addEventListener( 'contextmenu', showContextMenu );
	return panelContextMenu;
};

TF_panel.prototype.addWidget = function( options ) {
	var widget = new TF_widget( this.panel, options );
	var self = this;
	widget.registerCallback( this.fireChange.bind( self ) );
	widget.destroyCallback = this.deleteWidget.bind( self );
	this.widgets.push( widget );

	this.draw();
};

TF_panel.prototype.deleteWidget = function( widget ) {
	var index = this.widgets.findIndex( function( elem ) {
		return elem === widget;
	});
	this.widgets.splice( index, 1 );

	this.draw();
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
	for( var index = 0; index < this.callbacks.length; index++ ) {
		var callback = this.callbacks[ index ];
		callback();
	}
};

//redraw the histogram
TF_panel.prototype.draw = function() {
	if( this.updateHistogram ) {
		//underlying data
		var data = this.parent.data;
		if ( data !== this.data ) {
			this.data = data;
			this.statistics = this.calcStatistics( this.options.statistics );
			this.histogram = this.statistics.histogram;
		}
		this.drawHistogram( this.options.histogram );
		this.updateHistogram = false;
	}

	for( var index = 0; index < this.widgets.length; index++ ) {
		var widget = this.widgets[ index ];
		widget.drawWidget();
	}
};

/**
 * calculates the statistics for an array of data values necessary for displaying the histogram
 *
 * options.*:
 * numBins:		number
 */
TF_panel.prototype.calcStatistics = function( options ) {
	options = options || {};
	var statistics = {};
	var data = this.data;

	statistics.numBins = options.numBins;

	//calculate range of data values
	var min = Infinity;
	var max = -Infinity;

	var index = data.length;
	while ( index-- ) {
		var value = data[ index ];
		if ( value < min ) {
			min = value;
		}
		if ( value > max ) {
			max = value;
		}
	}

	statistics.range = { min: min, max: max };

	var histogram = new Int32Array( statistics.numBins );
	var binScale = statistics.numBins / ( statistics.range.max - statistics.range.min );

	for( var index = 0; index < data.length; index++ ) {
		var value = data[ index ];
		var bin = Math.floor( ( value - statistics.range.min ) * binScale );
		histogram[ bin ] += 1;
	}
	statistics.histogram = histogram;

	statistics.maxBin = 0;
	statistics.maxBinValue = 0;
	for ( var bin = 0; bin < statistics.numBins; bin++ ) {
		if (statistics.histogram[ bin ] > statistics.maxBinValue ) {
			statistics.maxBin = bin;
			statistics.maxBinValue = statistics.histogram[ bin ];
		}
	}

	return( statistics );
};

/*
 * draw the histogram to the histogram canvas
 */
TF_panel.prototype.drawHistogram = function( options ) {
	options = options || {};
	var data = this.parent.data;
	if ( !data ) {
		return;
	}

	var canvas = this.canvas;
	var context = canvas.getContext( '2d' );
	context.clearRect( 0, 0, canvas.width, canvas.height );
	context.fillStyle = options.backgroundColor;
	context.fillRect( 0, 0, canvas.width, canvas.height );
	context.fillStyle = options.fillColor;
	context.strokeStyle = options.lineColor;

	var xScale = canvas.width / this.statistics.numBins;

	/* plots the histogram bins as a polygon that traces the centers of each bin */
	var drawPolygonHistogram = function ( scale ) {
		context.beginPath();
		var maxVal = scale( this.statistics.maxBinValue );

		context.moveTo( 0, canvas.height );
		context.lineTo( 0, canvas.height - canvas.height * scale( this.statistics.histogram[ 0 ] ) / maxVal );

		var x = xScale / 2;
		for( var bin = 0; bin < this.statistics.numBins; bin++ ) {
			context.lineTo( x, canvas.height - canvas.height * scale( this.statistics.histogram[ bin ] ) / maxVal );
			x += xScale;
		}
		context.lineTo( canvas.width, canvas.height - canvas.height * scale( this.statistics.histogram[ this.statistics.numBins - 1 ] ) / maxVal );
		context.lineTo( canvas.width, canvas.height );
		context.lineTo( 0, canvas.height );

		context.closePath();
		context.fill();
		context.stroke();
	};

	/* plots the histogram bins as a series of n vertical bars (n = number of bins) */
	var drawBarHistogram = function( scale ) {
		var maxVal = scale( this.statistics.maxBinValue );
		context.beginPath();

		for( var bin = 0; bin < this.statistics.numBins; bin++ ) {
			context.moveTo( xScale * bin, canvas.height );
			context.lineTo( xScale * bin, canvas.height - ( canvas.height * scale( this.statistics.histogram[ bin ] ) ) / maxVal );
		}

		context.closePath();
		context.strokeStyle = options.fillColor;
		context.lineWidth = xScale;
		context.stroke();
	};

	var style = options.style || 'polygon';
	var scale = options.scale || Math.log;
	this.histogramScale = scale;
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

TF_panel.prototype.TFtoIMG = function() {
	var img = document.createElement( 'img' );
	var tfCanvas = document.createElement( 'canvas' );
	tfCanvas.height = 30;
	tfCanvas.width = 256;

	var context = tfCanvas.getContext( '2d' );

	for( var index = 0; index < this.widgets.length; index++ ) {
		var widget = this.widgets[ index ];
		var start = 1, end = 0;

		for( var index = 0; index < widget.controlPoints.length; index++ ) {
			var controlPoint = widget.controlPoints[ index ];
			if( controlPoint.value < start ) start = controlPoint.value;
			if( controlPoint.value > end ) end = controlPoint.value;
		}
		var width = end - start;

		var gradient = context.createLinearGradient( start * tfCanvas.width, 0, end * tfCanvas.width, 0 ); //horizontal gradient

		for( var index = 0; index < widget.controlPoints.length; index++ ) {
			var controlPoint = widget.controlPoints[ index ];
			var rgbColor = Color.parseColor( controlPoint.color );
			var rgbaColorString = 'rgba( ' + rgbColor.r + ', ' + rgbColor.g + ', ' + rgbColor.b + ', ' + controlPoint.alpha + ')';
			gradient.addColorStop( ( controlPoint.value - start ) / width, rgbaColorString );
		}

		context.fillStyle = gradient;
		context.fillRect( start * tfCanvas.width, 0, ( end - start ) * tfCanvas.width, tfCanvas.height )
	}

	img.src = tfCanvas.toDataURL();
	return img;
};


/* TF-widget contains one range of two or more control points
 *
 */
var TF_widget = function( parent, options ) {
	options = options || {};
	var self = this;
	this.parent = parent;
	this.callbacks = [];

	options.location = options.location || 0.5;
	options.controlPoints = options.controlPoints || [];
	options.opacity = options.opacity || 0.6;
	this.options = options;

	//create canvas for gradient background
	var canvas = document.createElement( 'canvas' );
	this.canvas = canvas;

	canvas.width = parent.width;
	canvas.height = parent.height;
	canvas.className = 'tf-widget-canvas overlay';
	canvas.style.opacity = options.opacity;
	//insert canvases below UI svg context
	parent.dom.insertBefore( canvas, parent.svgContext );

	//create context menus for rightclick interaction
	var widgetContextMenu = new ContextMenu();
	var menuItems = [
		{ name: 'Delete widget', 	callback: this.destructor.bind( self ) },
		/*{ name: 'Duplicate widget',	callback: function( e ) { console.log( 'click b' ) } },
		 { name: 'Bring to front',	callback: function( e ) { console.log( 'click b' ) } },
		 { name: 'Send to back',		callback: function( e ) { console.log( 'click b' ) } },
		 { name: 'Store as preset',	callback: function( e ) { console.log( 'click c' ) } },*/
	];
	widgetContextMenu.addItems( menuItems );
	this.widgetContextMenu = widgetContextMenu;

	this.controlPoints = [];//options.controlPoints;

	this.controlPoints.sortPoints = function() {
		this.sort( function ( a, b ) {
			return a.value > b.value;
		} );
	};
	this.controlPoints.addPoint = function( point ) {
		this.push( point );
		this.sortPoints();
	};

	this.createOutline();

	if( options.colors ) {
		this.addControlPoints( options.colors, 0.3, 0.5, options.location, 0.25 );
	}
	if(  options.controlPoints.length > 0 ) {
		for( var index = 0; index < options.controlPoints.length; index++ ) {
			var controlPoint = options.controlPoints[ index ];
			this.addControlPoint( controlPointOptions );
		}
	} else if( this.controlPoints.length === 0 ) {
		var viridis = [ '#440154', '#414487', '#2a788e', '#22a884', '#7cd250', '#fde725' ]; //viridis
		this.addControlPoints( viridis, 0.3, 0.5, options.location, 0.25 ); //add one default widget
	}

	this.outline.setPoints( this.controlPoints );

	this.createAnchor();
};

TF_widget.prototype.getOptions = function() {
	var options = {};
	options.controlPoints = [];
	for( var index = 0; index < this.controlPoints.length; index++ ) {
		var controlPoint = this.controlPoints[ index ];
		options.controlPoints.push( { value: controlPoint.value, alpha: controlPoint.alpha, color: controlPoint.color } );
	}
	return options;
};

TF_widget.prototype.destructor = function() {
	while( this.controlPoints.length > 0 ) {
		var deletedPoint = this.controlPoints.pop();
		this.parent.svgContext.removeChild( deletedPoint.handle );

	}
	this.parent.svgContext.removeChild( this.outline );
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

	var anchor = SVG.createRect( this.parent.svgContext, 0, 0 );
	anchor.classList.add( 'handle' );
	this.anchor = anchor;

	var self = this;
	var drawWidgetBound = this.drawWidget.bind( self );
	var moveAnchorBound = moveAnchor.bind( self );
	anchor.moveLock = 'N';

	/* moves anchor on mousemove while mouse down */
	function moveAnchor( e ) {
		e.preventDefault();
		e.stopPropagation();
		//restrict area of movement for control points

		var mouse = UI.getRelativePosition( e.clientX, e.clientY, parent.dom );

		//todo this is not handled very well yet
		if( mouse.x < 0 || mouse.x > this.canvas.width || mouse.y < 0 || mouse.y > this.canvas.height ) return;

		parent.dom.classList.add( 'drag' );
		var offsetX = anchor.data.x - mouse.x;
		var offsetY = anchor.data.y - mouse.y;
		if ( e.ctrlKey && anchor.moveLock == 'N' ) {
			anchor.moveLock = ( offsetX > offsetY ) ? 'H' : 'V';
		}

		if( anchor.moveLock === 'H' ) offsetY = 0;
		if( anchor.moveLock === 'V' ) offsetX = 0;

		var setX = ( anchor.moveLock !== 'V' ) ? mouse.x : null;
		var setY = ( anchor.moveLock !== 'H' ) ? mouse.y : null;

		anchor.set( setX, setY );

		for( var index = 0; index < this.controlPoints.length; index++ ) {
			var controlPoint = this.controlPoints[ index ];
			this.updateControlPoint( controlPoint, controlPoint.handle.data.x - offsetX, controlPoint.handle.data.y - offsetY );
		}
		this.outline.setPoints( this.controlPoints );

		drawWidgetBound();
	}

	function onMouseUp() {
		this.anchor.moveLock = 'N';
		parent.dom.classList.remove( 'drag' );
		document.removeEventListener( 'mousemove', moveAnchorBound );
	}

	function onMouseDown( e ) {
		if ( e.which !== 1 ) { //left mouse button
			return false;
		}
		document.addEventListener( 'mousemove', moveAnchorBound );
		//remove mouse move event on mouseup (one-time event)
		document.addEventListener( 'mouseup', onMouseUp.bind( self ), { once: true } );
	}

	function showContextMenu( e ) {
		self.widgetContextMenu.showAt( e.clientX, e.clientY );

		document.addEventListener( 'mousedown', self.widgetContextMenu.hidePanel, { once: true } );

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
	var parent = this.parent;
	var outline = SVG.createPolyline( this.parent.svgContext, null, this.canvas.width, this.canvas.height, 'value', 'alpha' );
	outline.classList.add( 'handle' );
	this.outline = outline;

	var self = this;

	function onMouseDown( e ) {
		console.log( 'mousedown');
		if ( !e.ctrlKey ) {
			return;
		}
		var pos = UI.getRelativePosition( e.clientX, e.clientY, parent.dom );
		//pos.y = this.parent.height - pos.y;

		var value = pos.x / parent.width;
		var alpha = 1.0 - ( pos.y / parent.height );

		console.log( 'outline clicked at ' + value + ', ' + alpha );

		var neighbors = self.findNeighborControlPoints( value );

		var leftColor  = Color.parseColor( neighbors.left.color ),
			rightColor = Color.parseColor( neighbors.right.color );

		var pct = ( value - neighbors.left.value ) / ( neighbors.right.value - neighbors.left.value );
		var rgb = Math.interpolate( [ leftColor.r, leftColor.g, leftColor.b ], [ rightColor.r, rightColor.g, rightColor.b ], pct );

		console.log( rgb[ 0 ] + ' ' + rgb[ 1 ] + ' ' + rgb[ 2 ] );
		var color = Color.RGBtoHEX( rgb[ 0 ], rgb[ 1 ], rgb[ 2 ] );
		console.log( 'left: ' + Color.RGBtoHEX( leftColor ) + ' right: ' + Color.RGBtoHEX( rightColor ) + '% :' + pct + ' col: ' + color );

		self.addControlPoint( value, alpha, color );
	}

	outline.addEventListener( 'mousedown', onMouseDown );

	//change cursor on hover+ctrl-hold to indicate addPoint function
	outline.addEventListener( 'mousemove', function( e ) {
		if ( e.ctrlKey ) this.classList.add( 'addCursor' );
	} );

	//remove cursor on mouseout
	outline.addEventListener( 'mouseleave', function() {
		this.classList.remove( 'addCursor' );
	} );
};

TF_widget.prototype.addControlPoint = function( value, alpha, color ) {
	color = color || '#000';
	var parent = this.parent;
	if( typeof value === 'object' ) {
		color = value.color;
		alpha = value.alpha;
		value = value.value;
	}

	var controlPoint = { value: value, alpha: alpha, color: color };

	var handle = SVG.createCircle( this.parent.svgContext, value * this.canvas.width, this.canvas.height - alpha * this.canvas.height, controlPoint.color );
	handle.classList.add( 'handle' );

	var width = this.parent.width,
		height = this.parent.height;

	var self = this;
	var updateWidgetBound = this.updateWidget.bind( self );
	var drawWidgetBound = this.drawWidget.bind( self );
	var moveHandleBound = moveHandle.bind( self );

	/* moves control point handles on mousemove while mouse down */
	function moveHandle( e ) {

		var mouse = UI.getRelativePosition( e.clientX, e.clientY, parent.dom );

		//restrict area of movement for control points
		//todo this is not handled very well yet
		if( mouse.x < 0 || mouse.x > width || mouse.y < 0 || mouse.y > height ) return;

		this.updateControlPoint( controlPoint, mouse.x, mouse.y );

		//update widget through callback function
		updateWidgetBound();
	}

	function onMouseUp() {
		document.removeEventListener( 'mousemove', moveHandleBound );
	}

	function onMouseDown( e ) {
		e.preventDefault();
		e.stopPropagation();
		if ( e.ctrlKey ) {
			self.deleteControlPoint( controlPoint );
			updateWidgetBound();
		}

		document.addEventListener( 'mousemove', moveHandleBound );
		//remove mouse move event on mouseup
		document.addEventListener( 'mouseup', onMouseUp, { once: true } );
		return false;
	}

	//add mouse move event when mouse is pressed
	handle.addEventListener( 'mousedown', onMouseDown );

	handle.addEventListener( 'dblclick', function( e ) {
		e.preventDefault();
		e.stopPropagation();
		console.log( 'request colorpicker' );
		parent.cp_widget.showAt( e.pageX, e.pageY, handle );
		parent.cp_widget.color.registerCallback( handle, function( col ) {
			var colHex = Color.RGBtoHEX( col.rgb );
			handle.setFillColor( colHex );
			controlPoint.color = colHex;
			drawWidgetBound();
		} );
		parent.cp_widget.color.set( controlPoint.color, handle );
		parent.cp_widget.panel.show();

		document.addEventListener( 'mousedown', parent.cp_widget.hidePanel, { once: true } );
		return false;
	} );

	//modify cursor on hover and ctrl-hold to indicate deletePoint function
	handle.addEventListener( 'mousemove', function( e ) {
		if ( e.ctrlKey ) this.classList.add( 'deleteCursor' );
	} );

	//remove cursor on mouseout
	handle.addEventListener( 'mouseleave', function() {
		this.classList.remove( 'deleteCursor' );
	} );

	controlPoint.handle = handle;
	this.controlPoints.addPoint( controlPoint );
};


TF_widget.prototype.addControlPoints = function( colors, rangeValues, rangeAlpha, anchorValue, anchorAlpha ) {
	var stepValues = rangeValues / ( colors.length - 1 );
	var startValues = anchorValue - ( rangeValues / 2 );
	var stepAlpha = rangeAlpha / ( colors.length - 1 );
	var startAlpha = anchorAlpha - ( rangeAlpha / 2 );
	var self = this;
	colors.map( function ( color, index ) {
		return self.addControlPoint( startValues + index * stepValues, startAlpha + index * stepAlpha, color );
	} );
};

TF_widget.prototype.updateControlPoint = function( controlPoint, x, y ) {
	x = x || null;
	y = y || null;
	if( typeof controlPoint !== 'object' ) {
		controlPoint = this.findControlPoint( controlPoint );
	}
	//update position of svg
	if( x ) {
		//restrict x coordinate to [ 0, width ]
		//x = Math.clamp( x, 0, this.parent.width );
		controlPoint.value = x / this.parent.width;
	}
	if( y ) {
		//restrict y coordinate to [ 0, height ]
		//y = Math.clamp( y, 0, this.parent.height );
		controlPoint.alpha = 1.0 - ( y / this.parent.height );
	}

	controlPoint.handle.set( x, y );
};

TF_widget.prototype.findControlPoint = function( value, remove ) {
	remove = remove || false;
	var index = this.controlPoints.findIndex( function( point ) {
		return point.value === value;
	} );
	if ( index < 0 ) {
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
 * find the two controlPoints that the value lies inbetween
 */
TF_widget.prototype.findNeighborControlPoints = function( value ) {
	var right = {}, left = {};
	for( var index = 0; index < this.controlPoints.length; index++ ) {
		var controlPoint = this.controlPoints[ index ];
		right = controlPoint;
		if( controlPoint.value > value ) {
			break;
		}
		left = right;
	}
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

	var anchorAlpha = ( left.alpha + ( right.alpha - left.alpha ) * ( anchorValue - left.value ) / ( right.value - left.value ) ) / 2;
	var w = this.anchor.data.width,
		h = this.anchor.data.height;
	var x = anchorValue * this.canvas.width - ( w / 2 ),
		y = this.canvas.height - anchorAlpha * this.canvas.height - ( h / 2 );
	this.anchor.set( x, y );
};

TF_widget.prototype.updateWidget = function() {
	//sort controlPoints by ascending value
	var controlPoints = this.controlPoints;
	controlPoints.sortPoints();

	this.outline.setPoints( controlPoints );
	//redraw
	this.drawWidget();

	this.updateAnchor();
};

/**
 * create polygon path for widget tracing positions of controlpoints
 * create gradient and draw polygon
 */
TF_widget.prototype.drawWidget = function() {
	var controlPoints = this.controlPoints;
	var canvas = this.canvas;

	var start = controlPoints[ 0 ].value;
	var end = controlPoints[ controlPoints.length - 1 ].value;
	var context = canvas.getContext( '2d' );

	context.clearRect( 0, 0, canvas.width, canvas.height );
	context.beginPath();
	context.moveTo( start * canvas.width, canvas.height );

	var widgetWidth = end - start;
	var gradient = context.createLinearGradient( start * canvas.width, 0, end * canvas.width, 0 ); //horizontal gradient

	for( var index = 0; index < controlPoints.length; index++ ) {
		var controlPoint = controlPoints[ index ];
		//draw line
		context.lineTo( controlPoint.value * canvas.width, canvas.height - controlPoint.alpha * canvas.height );
		//add gradient stop
		var stopPos = Math.clamp( controlPoint.value - start, 0, 1 ) / widgetWidth;
		gradient.addColorStop( stopPos, controlPoint.color );
	}

	context.lineTo( end * canvas.width, canvas.height );
	context.lineTo( start * canvas.width, canvas.height );

	context.closePath();

	context.fillStyle = gradient;
	context.fill();

	context.strokeStyle = '#eee';
	context.lineWidth = 1;
	context.stroke();

	this.fireChange();
	//propagate change to callbacks
};

var CP_widget = function( options ) {
	options = options || {};
	var panel = new Panel( options );
	var parent = null;
	this.color = new Color();

	panel.dom.id = 'cp-panel';
	panel.dom.classList.add( 'overlay' );
	panel.dom.classList.add( 'popup' );

	this.hidePanel = this.hide.bind( this );

	this.panel = panel;
	panel.dom.style.width = options.svPicker.size + options.hPicker.width + options.hPicker.pad + 4 + 'px';

	this.SVPicker = this.createSVPicker( this.color, options.svPicker );
	this.HPicker = this.createHPicker( this.color, options.hPicker );
	var inputFields = this.createInputFields( this.color );

	this.SVPicker.style.backgroundColor = "#FF0000";
};

CP_widget.prototype.hide = function() {
	this.panel.hide();

	if( this.parent ) { //remove previous parent
		this.color.removeCallback( this.parent );
	}
};

CP_widget.prototype.showAt = function( x, y, parent ) {
	if( parent ) this.parent = parent;

	this.panel.dom.style.top = y + 'px';
	this.panel.dom.style.left = x + 'px';
};

CP_widget.prototype.createSVPicker = function( color, options ) {
	var SVPicker = document.createElement( 'canvas' );
	SVPicker.className = 'field';
	SVPicker.width = options.size;
	SVPicker.height = options.size;
	SVPicker.setAttribute('style',
					'margin: 0;' +
					'padding: 0;' +
					'top: 0;' +
					'float: left;' +
					'height: ' + SVPicker.width + 'px;' +
					'width: ' + SVPicker.height + 'px;' );// +
						//'background: linear-gradient( to right, #FFF, rgba( 255, 255, 255, 0 ) )';
	this.panel.dom.appendChild( SVPicker );
	//var SVPicker = document.createElement( 'canvas' );
	/*SVPicker.setAttribute('style',
		'position:absolute;' +
		'float:left;' +
		'height: ' + SVPicker.width + 'px;' +
		'width: ' + SVPicker.height + 'px;' );*/
	var SVPickerContext = SVPicker.getContext( '2d' );

	var gradient = SVPickerContext.createLinearGradient( 0, 0, SVPicker.width, 0 ); //horizontal gradient
	gradient.addColorStop( 0, '#FFF' );
	gradient.addColorStop( 1, 'rgba( 255, 255, 255, 0 )' );
	SVPickerContext.fillStyle = gradient;
	SVPickerContext.fillRect( 0, 0, SVPicker.width, SVPicker.height );

	var SVPickerGradientOverlayCanvas = document.createElement( 'canvas' );
	SVPickerGradientOverlayCanvas.width = SVPicker.width;
	SVPickerGradientOverlayCanvas.height = SVPicker.height;
	SVPickerGradientOverlayCanvas.setAttribute('style',
						'margin: 0;' +
						'padding: 0;' +
						'top: 0;' +
						'float: left;' +
						'margin-left:' + -SVPicker.width +  'px;' +
						'height: ' + SVPicker.width + 'px;' +
						'width: ' + SVPicker.height + 'px;' );// +
						//'background: linear-gradient( rgba( 0, 0, 0, 0 ), #000 )';
	this.panel.dom.appendChild( SVPickerGradientOverlayCanvas );
	var SVPickerGradientOverlayContext = SVPickerGradientOverlayCanvas.getContext( '2d' );

	gradient = SVPickerGradientOverlayContext.createLinearGradient( 0, SVPicker.height, 0, 0 ); //vertical gradient
	gradient.addColorStop( 0,'#000' );
	gradient.addColorStop( 1, 'rgba( 0, 0, 0, 0 )' );
	SVPickerGradientOverlayContext.fillStyle = gradient;
	SVPickerGradientOverlayContext.fillRect( 0, 0, SVPicker.width, SVPicker.height );

	var SVPickerCursor = document.createElement( 'div' );
	SVPickerCursor.className = 'handle';
	SVPickerCursor.width = options.cursorRadius * 2;
	SVPickerCursor.height = options.cursorRadius * 2;
	SVPickerCursor.setAttribute('style',
						'height: '+ SVPickerCursor.height + 'px;' +
						'width: '+ SVPickerCursor.width + 'px;' +
						'border-radius: 50%;' +
						'position: relative;' +
						'top: -'+ options.cursorRadius + 'px;' +
						'left: -'+ options.cursorRadius + 'px' );
	SVPicker.appendChild( SVPickerCursor );

	var pickSV = function( e ) {
		console.log( 'pick SV' );
		e.preventDefault();
		e.stopPropagation();

		var pos = UI.getRelativePosition( e.clientX, e.clientY, SVPicker );

		pos.x = Math.clamp( pos.x, 0, SVPicker.width );
		pos.y = Math.clamp( pos.y, 0, SVPicker.height );

		var saturation = pos.x / SVPicker.width;
		var value = 1 - ( pos.y / SVPicker.height );

		color.set( { s: saturation, v: value }, SVPicker );

		var cursorX = pos.x - options.cursorRadius;
		var cursorY = pos.y - options.cursorRadius;

		SVPickerCursor.style.left = cursorX + 'px';
		SVPickerCursor.style.top = cursorY + 'px';
		return false;
	};

	var cp_widget = this;

	function onMouseUp() {
		//remove mousemove function
		document.removeEventListener( 'mousemove', pickSV );
		//hide color picker on next click in document
		document.addEventListener( 'mousedown', cp_widget.hidePanel, { once: true } );
	}

	function onMouseDown( e ) {
		e.preventDefault();
		e.stopPropagation();
		pickSV( e );
		//add mousemove function (while mouse is down)
		document.addEventListener( 'mousemove', pickSV );
		//prevent panel from hiding while mouse is down
		document.removeEventListener( 'mousedown', cp_widget.hidePanel );

		document.addEventListener( 'mouseup', onMouseUp, { once: true } );
		return false;
	}

	SVPicker.addEventListener( 'mousedown', onMouseDown );

	SVPicker.update = function( color ) {
		var hsv = color.getHSV();
		var rgb = Color.HSVtoRGB( hsv.h, 1, 1 );
		SVPicker.style.backgroundColor = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';

		var xPos = hsv.s * SVPicker.width;
		var yPos = ( 1 - hsv.v ) * SVPicker.height;

		var cursorX = xPos - options.cursorRadius;
		var cursorY = yPos - options.cursorRadius;

		SVPickerCursor.style.left = cursorX + 'px';
		SVPickerCursor.style.top = cursorY + 'px';
	};

	color.registerCallback( SVPicker, SVPicker.update );

	return SVPicker;
};

CP_widget.prototype.createHPicker = function( color, options ) {
	var HPicker = document.createElement( 'div' );
	HPicker.className = 'field';
	HPicker.width = options.width;
	HPicker.height = options.height;
	HPicker.setAttribute('style',
						'float: right;' +
						'margin-left: '+ options.pad + 'px;' +
						'padding: 0;' +
						'height: '+ HPicker.height + 'px;' +
						'width: '+ HPicker.width + 'px;' );// +
						//'background: linear-gradient(#f00 0, #f0f 17%, #00f 33%, #0ff 50%, #0f0 67%, #ff0 83%, #f00 100%)' );

	var HPickerCanvas = document.createElement( 'canvas' );
	HPickerCanvas.setAttribute('style',
		'float:left;' +
		'height: ' + HPicker.height + 'px;' +
		'width: ' + HPicker.width + 'px;' );
	HPickerCanvas.width = HPicker.width;
	HPickerCanvas.height = HPicker.height;
	var HPickerContext = HPickerCanvas.getContext( '2d' );

	var gradient = HPickerContext.createLinearGradient( 0, HPicker.height, 0, 0 ); //horizontal gradient
	gradient.addColorStop( 1.00, '#f00' );
	gradient.addColorStop( 0.83, '#f0f' );
	gradient.addColorStop( 0.67, '#00f' );
	gradient.addColorStop( 0.50, '#0ff' );
	gradient.addColorStop( 0.33, '#0f0' );
	gradient.addColorStop( 0.17, '#ff0' );
	gradient.addColorStop( 0.00, '#f00' );

	HPickerContext.fillStyle = gradient;
	HPickerContext.fillRect( 0, 0, HPicker.width, HPicker.height );
	HPicker.appendChild( HPickerCanvas );
	
	this.panel.dom.appendChild( HPicker );

	var HPickerCursor = document.createElement( 'div' );
	HPickerCursor.className = 'handle';
	HPickerCursor.width = HPicker.width;
	HPickerCursor.height = options.cursorHeight;
	HPickerCursor.setAttribute('style',
						'position:relative;' +
						'top: 0px;' +
						'left: 0px;' +
						'height: '+ HPickerCursor.height + 'px;' +
						'width: '+ HPickerCursor.width + 'px' );
	HPicker.appendChild( HPickerCursor );

	var pickHue = function( e ) {
		console.log( 'pick hue' );
		e.preventDefault();
		e.stopPropagation();

		var pos = UI.getRelativePosition( null, e.clientY, HPicker );

		//pos.y = Math.round( e.clientY - HPicker.getBoundingClientRect().top );
		pos.y = Math.clamp( pos.y, 0, HPicker.height );

		var hue = 1 - ( pos.y / HPicker.height );
		color.set( { h: hue }, HPicker );

		var cursorY = pos.y - ( HPickerCursor.height / 2 );
		HPickerCursor.style.top = cursorY + 'px';

		return false;
	};


	var cp_widget = this;

	function onMouseUp() {
		//remove mousemove function
		document.removeEventListener( 'mousemove', pickHue );
		//hide color picker on next click in document
		document.addEventListener( 'mousedown', cp_widget.hidePanel, { once: true } );
	}

	function onMouseDown( e ) {
		e.preventDefault();
		e.stopPropagation();
		pickHue( e );
		//add mousemove function (while mouse is down)
		document.addEventListener( 'mousemove', pickHue );
		//prevent panel from hiding while mouse is down
		document.removeEventListener( 'mousedown', cp_widget.hidePanel );

		document.addEventListener( 'mouseup', onMouseUp, { once: true } );
		return false;
	}
	HPicker.addEventListener( 'mousedown', onMouseDown );

	HPicker.update = function( color ) {
		var hue = color.getHSV().h;

		var yPos = ( 1 - hue ) * HPicker.height;
		var cursorY = yPos - ( HPickerCursor.height / 2 );
		HPickerCursor.style.top = cursorY + 'px';
	};

	color.registerCallback( HPicker, HPicker.update );
	return HPicker;
};

CP_widget.prototype.createInputFields = function( color ) {
	var inputContainer = document.createElement( 'div' );
	inputContainer.height = 20;
	this.panel.dom.appendChild( inputContainer );
	inputContainer.setAttribute('style',
						'float: left;' +
						'height: '+ inputContainer.height +'px;' );

	var inputWidth = Math.max( Math.floor( ( this.SVPicker.width / 3 ) - 5 ), 22 );

	var inputStyle =	'margin-top: 4px;' +
						'height: 12px;' +
						'width:'+ inputWidth + 'px;';

	var inputs = [ 'r', 'g', 'b' ];
	var range = [ 0, 255 ];

	function inputEvent() {
		var value = Number( this.value );

		//constrain input to valid numbers
		value = Math.clamp( value, range[ 0 ], range[ 1 ] );
		if( value !== this.value ) this.value = value;
		var components = {};
		components[ this.name ] = value;
		color.set( components, inputContainer );
		//console.log('input changed to: ' + this.value + ' ' + this.name );
	}

	function pickColor() {
		color.set( { r: Number( inputs[ 0 ].value ), g: Number( inputs[ 1 ].value ), b: Number( inputs[ 2 ].value ) }, inputContainer );
	}

	for( var num = 0; num < inputs.length; num++ ) {
		var input = document.createElement( 'input' );
		input.type = 'number';
		input.min = range[ 0 ];
		input.max = range[ 1 ];
		input.step = 1;
		input.value = 255;
		input.title = inputs[ num ];
		input.name = inputs[ num ];
		input.setAttribute('style', inputStyle );
		if( num < inputs.length - 1 ) input.style.marginRight = '3px';
		inputContainer.appendChild( input );
		input.addEventListener( 'mousedown', function( e ) { e.stopPropagation(); } );
		input.addEventListener( 'input', inputEvent );
		inputs[ num ] = input;
	}

	inputContainer.update = function( color ) {
		var rgb = color.getRGB();
		inputs[ 0 ].value = rgb.r;
		inputs[ 1 ].value = rgb.g;
		inputs[ 2 ].value = rgb.b;
	};

	color.registerCallback( inputContainer, inputContainer.update );
};

var ContextMenu = function( options ) {
	options = options || {};
	var panel = new Panel( options );
	panel.dom.classList.add( 'menu' );
	panel.dom.classList.add( 'popup' );

	var itemsContainer = document.createElement( 'ul' );
	panel.dom.appendChild( itemsContainer );
	panel.dom.style.top = '0px';
	panel.dom.style.left = '0px';

	this.itemsContainer = itemsContainer;

	this.folders = new Map();

	this.panel = panel;
	this.hidePanel = this.hide.bind( this );

	this.caller = null;
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
	colors = colors || null;
	if( typeof name === 'object' ) {
		colors = name.colors;
		folder = name.folder;
		callback = name.callback;
		name = name.name;
	}
	var item = document.createElement( 'li' );
	item.id = name;
	item.onmousedown = function( e ) {
		e.preventDefault();
		e.stopPropagation();
		callback( e );
		return false;
	};

	if( colors ) {
		item.style.height = '24px';
		item.style.width = '200px';
		item.style.margin = '3px 0px';
		//item.style.background = 'linear-gradient(to right, ' + colors.join() + ')';
	}

	var link = document.createElement( 'a' );
	link.href = '#';
	link.target = '_self';
	link.innerHTML = name;

	item.appendChild( link );

	var parent = this.itemsContainer;

	if( folder && this.folders.get( folder ) ) parent = this.folders.get( folder );
	parent.appendChild( item );
};

ContextMenu.prototype.addFolder = function( name ) {
	var folder = document.createElement( 'li' );
	folder.id = name;
	folder.class = 'hasSubMenu';

	var link = document.createElement( 'a' );
	link.href = '#';
	link.target = '_self';
	link.innerHTML = name;
	folder.appendChild( link );

	var itemsSubContainer = document.createElement( 'ul' );
	itemsSubContainer.class = 'submenu';
	itemsSubContainer.id = name + 'SubMenu';
	folder.appendChild( itemsSubContainer );

	this.itemsContainer.appendChild( folder );
	this.folders.set( name, itemsSubContainer );
};

ContextMenu.prototype.showAt = function( x, y, caller ) {
	caller = caller || null;
	this.panel.dom.style.top = y + 'px';
	this.panel.dom.style.left = x + 'px';

	this.panel.show();
	this.caller = null;
};

ContextMenu.prototype.hide = function() {
	this.panel.hide();
	this.caller = null;
};
