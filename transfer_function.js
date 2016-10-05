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
	return a.map( ( _, i )  => a[ i ] * ( 1 - t ) + b[ i ] * t );
}

/**
 * class containing UI-related functionality
 */
class UI {
	static getRelativePosition( x, y, elem ) {
		return {
			x: x ? x - Math.floor( elem.getBoundingClientRect().left ) : null,
			y: y ? y - Math.floor( elem.getBoundingClientRect().top ) : null
		};
	}

	/* display spinning loading icon */
	static loading() {
		let loading = document.getElementById( 'loading' );
		if( !loading ) {
			loading = document.createElement( 'div' );
			loading.id = 'loading';
			document.body.appendChild( loading );

			let spinner = document.createElement( 'div' );
			loading.appendChild( spinner );
		}
		loading.style.visibility = 'visible';
	}

	/* hide spinning loading icon */
	static finishedLoading() {
		let loading = document.getElementById( 'loading' );
		if( loading ) {
			loading.style.visibility = 'hidden';
		}
	}
}

/**
 * UI element - eventually replace with Steve's UI class
 */
class Panel {
	constructor( options = {} ) {
		let dom = document.createElement( 'div' );
		dom.className = 'panel';
		document.body.appendChild( dom );
		this.dom = dom;
	}

	toggle() {
		this.dom.style.visibility = ( this.panel.dom.style.visibility === 'hidden' ) ? 'visible' : 'hidden';
	}

	hide() {
		console.log( 'hide' );
		this.dom.style.visibility = 'hidden';
	}

	show() {
		this.dom.style.visibility = 'visible';
	}
}

/**
 * helper class for creating SVG elements
 */
class SVG {
	/**
	 * set x- and y position for SVG elements
	 * also writes x- and y position to element.data.*
	 */
	static set( x, y ) {
		if( x ) {
			this.setAttribute( ( this.tagName === 'circle' ) ? 'cx' : 'x', x );
			this.data.x = x;
		}
		if( y ) {
			this.setAttribute( ( this.tagName === 'circle' ) ? 'cy' : 'y', y );
			this.data.y = y;
		}
	}

	/**
	 * sets fill color of SVG element
	 */
	static setFillColor( color ) {
		this.setAttribute( 'fill', color );
	}

	/**
	 * sets line color of SVG element
	 */
	static setLineColor( color ) {
		this.setAttribute( 'stroke', color );
	}

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
	static createCircle( parent, cx, cy, fillColor = 'none', r = 7, strokeColor = '#aaa', strokeWidth = '2px' ) {
		let circle = document.createElementNS( SVG.svgNS, 'circle' );

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
	}

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
	static createRect( parent, x, y, fillColor = 'black', w = 12, h = 12, strokeColor = '#aaa', strokeWidth = '2px' ) {
		let rect = document.createElementNS( SVG.svgNS, 'rect' );
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
	}

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
	static createPolyline( parent, points, scaleWidth = 1, scaleHeight = 1, attrX = 'x', attrY = 'y', invertY = true, fillColor = 'none', strokeColor = '#eee', strokeWidth = '3px' ) {
		let polyline = document.createElementNS( SVG.svgNS, 'polyline' );
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
			let pointString = '';
			for( let point of points ) {
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
	}


	static createLine( parent, points, scaleWidth = 1, scaleHeight = 1, invertY = true, stroke = '#eee', strokeWidth = '3px' ) {
		let line = document.createElementNS( SVG.svgNS, 'line' );
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
	}
}

SVG.svgNS = 'http://www.w3.org/2000/svg';
/**
 * Color operates in two color spaces: HSV and RGB
 * HSV colors are in a { hue ∈ [ 0, 1 ], saturation ∈ [ 0, 1 ], value ∈ [ 0, 1 ] } domain
 * RGB colors are in a { red ∈ [ 0, 255 ], green ∈ [ 0, 255 ], blue ∈ [ 0, 255 ] } domain
 */
class Color {

	constructor() {
		this.rgb = { r: 0, g: 0, b: 0 };
		this.hsv = { h: 0, s: 0, v: 0 };

		this.callbacks = [];

		this.set( this.rgb, null );
	}

	/**
	 * attach a callback function to color object
	 * owner is the element the function is contained in
	 * callback is the actual callback function 
	 */
	registerCallback( owner, callback ) {
		if ( this.callbacks.indexOf( { owner: owner, callback: callback } ) < 0 ) {
			this.callbacks.push( { owner: owner, callback: callback } );
		}
	}

	/**
	 * remove callbacks owned by owner
	 */
	removeCallback( owner ) {
		for( let i = 0; i < this.callbacks.length; i++ ) {
			if( this.callbacks[ i ].owner === owner ) {
				this.callbacks.splice( i, 1 );
			}
		}
	}

	/**
	 * fires all registered callback functions
	 */
	fireChange( caller = null ) {
		for( let callbackObject of this.callbacks ) {
			let owner = callbackObject.owner;
			let callback = callbackObject.callback;
			if( owner !== caller ) {
				callback( this );
			}
		}
	}

	/**
	 * value is an object containing key, value pairs specifying new color values, either in rgb or hsv
	 * components may be missing
	 * e.g. { r: 255, g: 0, b: 120 } or { r: 255 } or { s: 1, v: 0 }
	 * 
	 * caller may be passed to identify the element that triggered the change 
	 * (in order to not fire the change event back to that element)
	 */
	set( col, caller = null ) {
		col = Color.parseColor( col );
		//check keys in col object
		let vars = Object.keys( col ).join( '' );
		//test if string of keys contain 'rgb' or 'hsv'
		let setRGB = /[rgb]/i.test( vars );
		let setHSV = /[hsv]/i.test( vars );

		if( vars.length == 0 || setRGB === setHSV ) {
			console.err( 'invalid params in color setter: cannot assign' );
			return;
		}
		
		//assign each component to the respective color parameter
		Object.keys( col ).forEach( ( key ) => {
			if( setRGB ) 		this.rgb[ key ] = col[ key ];
			else if( setHSV )	this.hsv[ key ] = col[ key ];
		} );

		//update the color space value not assigned through the setter
		if( setRGB ) 		this.hsv = Color.RGBtoHSV( this.rgb );
		else if( setHSV )	this.rgb = Color.HSVtoRGB( this.hsv );

		//notify all attached callbacks
		this.fireChange( caller );
	}

	getRGB() {
		return this.rgb;
	}

	getHSV() {
		return this.hsv;
	}

	static RGB( x, y, z ) {
		return { r: x, g: y, b: z };
	}

	static HSV( x, y, z ) {
		return { h: x, s: y, v: z };
	}

	/**
	 * parses an unknown input color value
	 * can be HEX = #FFFFFF or #FFF, RGB = rgb( 255, 255, 255 ) or color object
	 * returns RGB object for parsed strings or the original object for color objects
	 */
	static parseColor( col ) {
		if( col === null ) return null;
		//check if color is a string, otherwise do conversion to color object
		if( typeof col === 'string' ) {
			//HEX
			if( col.startsWith( '#' ) ) {
				return Color.HEXtoRGB( col );
			//RGB(A) (would discard alpha value)
			} else if( col.startsWith( 'rgb' ) ) {
				let parsedNumbers = col.match( /^\d+|\d+\b|\d+(?=\w)/g ).map( function ( v ) { return +v; } );
				if( parsedNumbers.length < 3 ) {
					console.err( 'tried to assign invalid color ' + col );
					return;
				}
				return RGB( parsedNumbers[ 0 ], parsedNumbers[ 1 ], parsedNumbers[ 2 ] );
			}
		} else if( typeof col === 'object' ) {
			return col;
			/*//check keys in col object
			let vars = Object.keys( col ).join( '' );
			//test if string of keys contain 'rgb' or 'hsv'
			let isRGB = vars.includes( r ) && vars.includes( g ) && vars.includes( b );
			let isHSV = vars.includes( h ) && vars.includes( s ) && vars.includes( v );

			if( vars.length == 0 || isRGB === isHSV ) {
				console.err( 'could not parse color, invalid keys ' + vars + ' in passed color object' );
				return null;
			}

			if( isRGB ) 		return col;
			else if( isHSV )	return Color.HSVtoRGB( col );*/
		}
	}
	/**
	 * accepts parameters { r: x, g: y, b: z } OR r, g, b
	 */
	static RGBtoHEX( r, g, b ) {
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
	}
	/**
	 * convert HEX color to RGB
	 * from http://stackoverflow.com/a/5624139
	 * accepts parameter #ffffff or #fff (shorthand hex)
	 */
	static HEXtoRGB( hex ) {
		// Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
		let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
		hex = hex.replace(shorthandRegex, function(m, r, g, b) {
			return r + r + g + g + b + b;
		});

		let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? this.RGB( parseInt( result[ 1 ], 16 ), parseInt( result[ 2 ], 16 ), parseInt( result[ 3 ], 16 ) ) : null;
	}

	/**
	 * convert HSV color to RGB
	 * from http://stackoverflow.com/a/17243070
	 * accepts parameters { h: x, s: y, v: z } OR h, s, v
	 */
	static HSVtoRGB( h, s, v ) {
		let r, g, b, i, f, p, q, t;
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
	}

	/**
	 * convert RGB color to HSV
	 * from http://stackoverflow.com/a/17243070
	 * accepts parameters { r: x, g: y, b: z } OR r, g, b
	 */
	static RGBtoHSV( r, g, b ) {
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
	}
}

/**
 * TF_panel is the base class for the transfer function panel
 * contains the container DIV (panel), the histogram canvas, one or multiple TF_widgets, the SVG context for UI elements
 */
class TF_panel {
	parseOptions( options ) {
		if( typeof options === 'string' ) {
			options = JSON.parse( options );
		}
		/** panel appearance options
		 * width:			number 				width of histogram panel
		 * height: 			number
		 */
		options.panel = options.panel || {};
		options.panel.width = options.panel.width || 750;
		options.panel.height = options.panel.height || 150;

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
		let defaultPresets = [
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
		for( let index = 0; index < options.widgets.length; index++ ) {
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
	}

	exportOptions() {
		this.options.widgets = [];
		for( let widget of this.widgets ) {
			this.options.widgets.push( widget.getOptions() );
		}
		console.log( JSON.stringify( this.options ) );
	}

	constructor( parent, options = {} ) {
		let self = this;
		this.parent = parent;

		options = `{"panel":			{	"width":			750,
											"height":			150	},
					"statistics":		{	"numBins":			150	},
					"histogram":		{	"backgroundColor":	"#000000",
											"fillColor":		"#333333",
											"lineColor":		"#666666",
											"style":			"polygon",
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
																	"cursorHeight":4}	}	}`;

		this.options = this.parseOptions( options );

		this.callbacks = [];

		//parent dom element of TF panel
		let panel = new Panel();

		panel.dom.id = 'tf-panel';
		panel.dom.classList.add( 'overlay' );
		this.panel = panel;
		panel.width = this.options.panel.width;
		panel.height = this.options.panel.height;

		//canvas for drawing background histogram
		let canvas = document.createElement( 'canvas' );
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
		let svgContext = document.createElementNS( SVG.svgNS, 'svg' );
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
		this.histogramHover.classList.add( 'tooltip' );

		//tooltip for displaying value of histogram trace
		this.histogramTooltip = document.createElement( 'div' );
		this.histogramTooltip.className = 'tooltip';
		this.panel.dom.appendChild( this.histogramTooltip );

		//show tooltips on hover over tf panel
		svgContext.addEventListener( 'mousemove', function( e ) {
			let binWidth = this.canvas.width / this.statistics.numBins;
			let bin = Math.floor( e.pageX / binWidth );

			let xHover = e.pageX;
			let yHover = this.canvas.height - this.canvas.height * this.histogram.scale( this.statistics.histogram[ bin ] ) / this.histogram.scale( this.statistics.maxBinValue );
			if( yHover === Infinity ) yHover = this.canvas.height;

			this.histogramHover.setAttribute( 'cx', xHover );
			this.histogramHover.setAttribute( 'cy', yHover );

			this.histogramTooltip.innerHTML = 'value: ' + Math.floor( ( e.pageX / this.canvas.width ) * 255 ) + '<br>' + 'count: ' + this.statistics.histogram[ bin ];
			this.histogramTooltip.style.left = xHover + 'px';
			this.histogramTooltip.style.top = yHover + 'px';
		}.bind( self ), true );

		//add tf_widgets

		this.widgets = [];
		for( let widgetOptions of this.options.widgets ) {
			this.addWidget( widgetOptions );
		}
		if( this.options.widgets.length === 0 ) {
			this.addWidget(); //add one default widget
		}

		//add color picker
		let cp_widget = new CP_widget( this.options.colorpicker );
		panel.cp_widget = cp_widget;

		this.draw();
	}

	/**
	 *
	 */
	addContextMenu( options = {} ) {
		let self = this;
		let panelContextMenu = new ContextMenu();

		let folderName = 'Add widget';
		panelContextMenu.addFolder( folderName );

		function createGradientPresetObject( name, colors ) {
			return {
				name: name,
				folder: folderName,
				colors: colors,
				callback: function( e ) {
					self.addWidget( { location: e.clientX / self.panel.width, colors: colors } );
				}
			};
		}

		let menuObjects = [];
		for( let preset of options.presets ) {
			menuObjects.push( createGradientPresetObject( preset.name, preset.colors ) );
		}

		panelContextMenu.addItems( menuObjects );
		function showContextMenu( e ) {
			self.panelContextMenu.showAt( e.clientX, e.clientY );

			document.addEventListener( 'mousedown', self.panelContextMenu.hidePanel, { once: true } );

			//disable default context menu
			e.preventDefault();
		}

		this.panel.dom.addEventListener( 'contextmenu', showContextMenu );
		return panelContextMenu;
	}

	addWidget( options ) {
		let widget = new TF_widget( this.panel, options );
		let self = this;
		widget.registerCallback( this.fireChange.bind( self ) );
		widget.destroyCallback = this.deleteWidget.bind( self );
		this.widgets.push( widget );

		this.draw();
	}

	deleteWidget( widget ) {
		let index = this.widgets.findIndex( elem => elem === widget );
		this.widgets.splice( index, 1 );

		this.draw();
	}

	/**
	 * attach a callback function to color object
	 * owner is the element the function is contained in
	 * callback is the actual callback function
	 */
	registerCallback( callback ) {
		if ( this.callbacks.indexOf( callback ) < 0 ) {
			this.callbacks.push( callback );
		}
	}

	fireChange() {
		for( let callback of this.callbacks ) {
			callback();
		}
	}

	//redraw the histogram
	draw() {
		if( this.updateHistogram ) {
			//underlying data
			let data = this.parent.data;
			if ( data !== this.data ) {
				this.data = data;
				this.statistics = this.calcStatistics( this.options.statistics );
				this.histogram = this.statistics.histogram;
			}
			this.drawHistogram( this.options.histogram );
			this.updateHistogram = false;
		}

		for( let widget of this.widgets ) {
			widget.drawWidget();
		}
	}

	/**
	 * calculates the statistics for an array of data values necessary for displaying the histogram
	 *
	 * options.*:
	 * numBins:		number
	 */
	calcStatistics( options = {} ) {
		let statistics = {};
		let data = this.data;

		statistics.numBins = options.numBins;

		//calculate range of data values
		let min = Infinity;
		let max = -Infinity;

		let index = data.length;
		while ( index-- ) {
			let value = data[ index ];
			if ( value < min ) {
				min = value;
			}
			if ( value > max ) {
				max = value;
			}
		}

		statistics.range = { min: min, max: max };

		let histogram = new Int32Array( statistics.numBins );
		let binScale = statistics.numBins / ( statistics.range.max - statistics.range.min );

		//for( let index = 0; index < data.length; index++ ) {
		for (let value of data ) {
			let bin = Math.floor( ( value - statistics.range.min ) * binScale );
			histogram[ bin ] += 1;
		}
		statistics.histogram = histogram;

		statistics.maxBin = 0;
		statistics.maxBinValue = 0;
		for ( let bin = 0; bin < statistics.numBins; bin++ ) {
			if (statistics.histogram[ bin ] > statistics.maxBinValue ) {
				statistics.maxBin = bin;
				statistics.maxBinValue = statistics.histogram[ bin ];
			}
		}

		return( statistics );
	}

	/*
	 * draw the histogram to the histogram canvas
	 */
	drawHistogram( options = {} ) {
		let data = this.parent.data;
		if ( !data ) {
			return;
		}

		let canvas = this.canvas;
		let context = canvas.getContext( '2d' );
		context.clearRect( 0, 0, canvas.width, canvas.height );
		context.fillStyle = options.backgroundColor;
		context.fillRect( 0, 0, canvas.width, canvas.height );
		context.fillStyle = options.fillColor;
		context.strokeStyle = options.lineColor;

		let xScale = canvas.width / this.statistics.numBins;

		/* plots the histogram bins as a polygon that traces the centers of each bin */
		let drawPolygonHistogram = function ( scale ) {
			context.beginPath();
			let maxVal = scale( this.statistics.maxBinValue );

			context.moveTo( 0, canvas.height );
			context.lineTo( 0, canvas.height - canvas.height * scale( this.statistics.histogram[ 0 ] ) / maxVal );

			let x = xScale / 2;
			for( let bin = 0; bin < this.statistics.numBins; bin++ ) {
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
		let drawBarHistogram = function( scale ) {
			let maxVal = scale( this.statistics.maxBinValue );
			context.beginPath();

			for( let bin = 0; bin < this.statistics.numBins; bin++ ) {
				context.moveTo( xScale * bin, canvas.height );
				context.lineTo( xScale * bin, canvas.height - ( canvas.height * scale( this.statistics.histogram[ bin ] ) ) / maxVal );
			}

			context.closePath();
			context.strokeStyle = options.fillColor;
			context.lineWidth = xScale;
			context.stroke();
		};

		let style = options.style || 'polygon';
		let scale = options.scale || Math.log;
		this.histogram.scale = scale;
		let overlayUnscaled = options.overlayUnscaled;
		let identityFunction = function( x ) { return x; };
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
	}

	getTF() {
		/**
		 * TODO
		 */
	}

	TFtoIMG() {
			var img = document.createElement( 'img' );
			let tfCanvas = document.createElement( 'canvas' );
			tfCanvas.height = 30;
			tfCanvas.width = 256;

			let context = tfCanvas.getContext( '2d' );

			for( let widget of this.widgets ) {
				let start = 1, end = 0;

				for( let controlPoint of widget.controlPoints ) {
					if( controlPoint.value < start ) start = controlPoint.value;
					if( controlPoint.value > end ) end = controlPoint.value;
				}
				let width = end - start;

				let gradient = context.createLinearGradient( start * tfCanvas.width, 0, end * tfCanvas.width, 0 ); //horizontal gradient

				for( let controlPoint of widget.controlPoints ) {
					let rgbColor = Color.parseColor( controlPoint.color );
					let rgbaColorString = 'rgba( ' + rgbColor.r + ', ' + rgbColor.g + ', ' + rgbColor.b + ', ' + controlPoint.alpha + ')';
					gradient.addColorStop( ( controlPoint.value - start ) / width, rgbaColorString );
				}

				context.fillStyle = gradient;
				context.fillRect( start * tfCanvas.width, 0, ( end - start ) * tfCanvas.width, tfCanvas.height )
			}

			img.src = tfCanvas.toDataURL();
			return img;
	}
}

/* TF-widget contains one range of two or more control points
 *
 */
class TF_widget {
	constructor( parent, options = {} ) {
		let self = this;
		this.parent = parent;
		this.callbacks = [];

		options.location = options.location || 0.5;
		options.controlPoints = options.controlPoints || [];
		options.opacity = options.opacity || 0.6;
		this.options = options;

		//create canvas for gradient background
		let canvas = document.createElement( 'canvas' );
		this.canvas = canvas;

		canvas.width = parent.width;
		canvas.height = parent.height;
		canvas.className = 'tf-widget-canvas overlay';
		canvas.style.opacity = options.opacity;
		//insert canvases below UI svg context
		parent.dom.insertBefore( canvas, parent.svgContext );

		//create context menus for rightclick interaction
		let widgetContextMenu = new ContextMenu();
		let menuItems = [
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
			this.sort( ( a, b ) => ( a.value > b.value ) );
		}
		this.controlPoints.addPoint = function( point ) {
			this.push( point );
			this.sortPoints();
		};

		this.createOutline();

		if( options.colors ) {
			this.addControlPoints( options.colors, 0.3, 0.5, options.location, 0.25 );
		}
		if(  options.controlPoints.length > 0 ) {
			for( let controlPointOptions of options.controlPoints ) {
				this.addControlPoint( controlPointOptions );
			}
		} else if( this.controlPoints.length === 0 ) {
			let viridis = [ '#440154', '#414487', '#2a788e', '#22a884', '#7cd250', '#fde725' ]; //viridis
			this.addControlPoints( viridis, 0.3, 0.5, options.location, 0.25 ); //add one default widget
		}

		this.outline.setPoints( this.controlPoints );

		this.createAnchor();
	}

	getOptions() {
		let options = {};
		options.controlPoints = [];
		for( let controlPoint of this.controlPoints ) {
			options.controlPoints.push( { value: controlPoint.value, alpha: controlPoint.alpha, color: controlPoint.color } );
		}
		return options;
	}

	destructor() {
		while( this.controlPoints.length > 0 ) {
			let deletedPoint = this.controlPoints.pop();
			this.parent.svgContext.removeChild( deletedPoint.handle );

		}
		this.parent.svgContext.removeChild( this.outline );
		this.parent.svgContext.removeChild( this.anchor );
		this.parent.dom.removeChild( this.canvas );
		this.destroyCallback( this );
	}

	registerCallback( callback ) {
		if ( this.callbacks.indexOf( callback ) < 0 ) {
			this.callbacks.push( callback );
		}
	}

	fireChange() {
		for( let callback of this.callbacks ) {
			callback();
		}
	}

	createAnchor() {
		let parent = this.parent;

		let anchor = SVG.createRect( this.parent.svgContext, 0, 0 );
		anchor.classList.add( 'handle' );
		this.anchor = anchor;

		let self = this;
		let drawWidgetBound = this.drawWidget.bind( self );
		let moveAnchorBound = moveAnchor.bind( self );
		anchor.moveLock = 'N';

		/* moves anchor on mousemove while mouse down */
		function moveAnchor( e ) {
			e.preventDefault();
			e.stopPropagation();
			//restrict area of movement for control points
			let mouseX = e.pageX,
				mouseY = e.pageY;
			//todo this is not handled very well yet
			if( mouseX < 0 || mouseX > canvas.width || mouseY < 0 || mouseY > canvas.height ) return;

			parent.dom.classList.add( 'drag' );
			let offsetX = anchor.data.x - mouseX;
			let offsetY = anchor.data.y - mouseY;
			if ( e.ctrlKey && anchor.moveLock == 'N' ) {
				anchor.moveLock = ( offsetX > offsetY ) ? 'H' : 'V';
			}

			if( anchor.moveLock === 'H' ) offsetY = 0;
			if( anchor.moveLock === 'V' ) offsetX = 0;

			let setX = ( anchor.moveLock !== 'V' ) ? mouseX : null;
			let setY = ( anchor.moveLock !== 'H' ) ? mouseY : null;

			anchor.set( setX, setY );

			for( let controlPoint of this.controlPoints ) {
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
		}
		anchor.addEventListener( 'contextmenu', showContextMenu );

		//add mouse move event when mouse is pressed
		anchor.addEventListener( 'mousedown', onMouseDown );

		this.updateAnchor();
	}

	createOutline() {
		let parent = this.parent;
		let outline = SVG.createPolyline( this.parent.svgContext, null, this.canvas.width, this.canvas.height, 'value', 'alpha' );
		outline.classList.add( 'handle' );
		this.outline = outline;

		let self = this;

		function onMouseDown( e ) {
			console.log( 'mousedown');
			if ( !e.ctrlKey ) {
				return;
			}
			let pos = UI.getRelativePosition( e.clientX, e.clientY, parent.dom );
			//pos.y = this.parent.height - pos.y;

			let value = pos.x / parent.width;
			let alpha = 1.0 - ( pos.y / parent.height );

			console.log( 'outline clicked at ' + value + ', ' + alpha );

			let neighbors = self.findNeighborControlPoints( value );

			let leftColor = Color.parseColor( neighbors.left.color ),
				rightColor = Color.parseColor( neighbors.right.color );

			let pct = ( value - neighbors.left.value ) / ( neighbors.right.value - neighbors.left.value );
			let rgb = Math.interpolate( [ leftColor.r, leftColor.g, leftColor.b ], [ rightColor.r, rightColor.g, rightColor.b ], pct );

			console.log( rgb[ 0 ] + ' ' + rgb[ 1 ] + ' ' + rgb[ 2 ] );
			let color = Color.RGBtoHEX( rgb[ 0 ], rgb[ 1 ], rgb[ 2 ] );
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
	}

	addControlPoints( colors, rangeValues, rangeAlpha, anchorValue, anchorAlpha ) {
		let stepValues = rangeValues / ( colors.length - 1 );
		let startValues = anchorValue - ( rangeValues / 2 );
		let stepAlpha = rangeAlpha / ( colors.length - 1 );
		let startAlpha = anchorAlpha - ( rangeAlpha / 2 );
		colors.map( ( color, index ) => { this.addControlPoint( startValues + index * stepValues, startAlpha + index * stepAlpha, color ); } );
	}

	addControlPoint( value, alpha, color = '#000' ) {
		let parent = this.parent;
		if( typeof value === 'object' ) {
			color = value.color;
			alpha = value.alpha;
			value = value.value;
		}

		let controlPoint = { value: value, alpha: alpha, color: color };

		let handle = SVG.createCircle( this.parent.svgContext, value * this.canvas.width, this.canvas.height - alpha * this.canvas.height, controlPoint.color );
		handle.classList.add( 'handle' );

		let width = this.parent.width,
			height = this.parent.height;

		let self = this;
		let updateWidgetBound = this.updateWidget.bind( self );
		let drawWidgetBound = this.drawWidget.bind( self );
		let moveHandleBound = moveHandle.bind( self );

		/* moves control point handles on mousemove while mouse down */
		function moveHandle( e ) {
			//restrict area of movement for control points
			//todo this is not handled very well yet
			if( e.pageX < 0 || e.pageX > width || e.pageY < 0 || e.pageY > height ) return;

			this.updateControlPoint( controlPoint, e.pageX, e.pageY );

			//update widget through callback function
			updateWidgetBound();
		}

		function onMouseUp() {
			document.removeEventListener( 'mousemove', moveHandleBound );
		}

		function onMouseDown( e ) {
			e.preventDefault();
			if ( e.ctrlKey ) {
				self.deleteControlPoint( controlPoint );
				updateWidgetBound();
			}

			document.addEventListener( 'mousemove', moveHandleBound );
			//remove mouse move event on mouseup
			document.addEventListener( 'mouseup', onMouseUp, { once: true } );
		}

		//add mouse move event when mouse is pressed
		handle.addEventListener( 'mousedown', onMouseDown );

		handle.addEventListener( 'dblclick', function( e ) {
			e.preventDefault();
			console.log( 'request colorpicker' );
			parent.cp_widget.showAt( e.pageX, e.pageY, handle );
			parent.cp_widget.color.registerCallback( handle, function( col ) {
				let colHex = Color.RGBtoHEX( col.rgb );
				handle.setFillColor( colHex );
				controlPoint.color = colHex;
				drawWidgetBound();
			} );
			parent.cp_widget.color.set( controlPoint.color, handle );
			parent.cp_widget.panel.show();

			document.addEventListener( 'mousedown', parent.cp_widget.hidePanel, { once: true } );
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
	}

	updateControlPoint( controlPoint, x = null, y = null ) {
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
	}

	findControlPoint( value, remove = false ) {
		let index = this.controlPoints.findIndex( point => point.value === value );
		if ( index < 0 ) {
			return null;
		}
		if( remove ) {
			this.controlPoints.splice( index, 1 );
			return null;
		} else {
			return this.controlPoints[ index ];
		}
	}

	deleteControlPoint( controlPoint ) {
		this.parent.svgContext.removeChild( controlPoint.handle );

		this.findControlPoint( controlPoint.value, true );
	}

	/**
	 * find the two controlPoints that the value lies inbetween
	 */
	findNeighborControlPoints( value ) {
		let right = {}, left = {};
		for( let controlPoint of this.controlPoints ) {
			right = controlPoint;
			if( controlPoint.value > value ) {
				break;
			}
			left = right;
		}
		return { left: left, right: right };
	}
	/**
	 * find position of anchor point under TF_widget curve and move anchor handle to appropriate position
	 */
	updateAnchor() {
		let controlPoints = this.controlPoints;

		let startValue = controlPoints[ 0 ].value,
			endValue = controlPoints[ controlPoints.length - 1 ].value;

		let anchorValue = startValue + ( endValue - startValue ) / 2;

		//find two controlPoints that anchor lies underneath
		let neighbors = this.findNeighborControlPoints( anchorValue ),
			left = neighbors.left,
			right = neighbors.right;

		let anchorAlpha = ( left.alpha + ( right.alpha - left.alpha ) * ( anchorValue - left.value ) / ( right.value - left.value ) ) / 2;
		let w = this.anchor.data.width,
			h = this.anchor.data.height;
		let x = anchorValue * this.canvas.width - ( w / 2 ),
			y = this.canvas.height - anchorAlpha * this.canvas.height - ( h / 2 );
		this.anchor.set( x, y );
	}

	updateWidget() {
		//sort controlPoints by ascending value
		let controlPoints = this.controlPoints;
		controlPoints.sortPoints();

		this.outline.setPoints( controlPoints );
		//redraw
		this.drawWidget();
		
		this.updateAnchor();
	}

	/**
	 * create polygon path for widget tracing positions of controlpoints
	 * create gradient and draw polygon
	 */
	drawWidget() {
		let controlPoints = this.controlPoints;
		let canvas = this.canvas;

		let start = controlPoints[ 0 ].value;
		let end = controlPoints[ controlPoints.length - 1 ].value;
		let context = canvas.getContext( '2d' );

		context.clearRect( 0, 0, canvas.width, canvas.height );
		context.beginPath();
		context.moveTo( start * canvas.width, canvas.height );

		let widgetWidth = end - start;
		var gradient = context.createLinearGradient( start * canvas.width, 0, end * canvas.width, 0 ); //horizontal gradient

		for( let controlPoint of controlPoints ) {
			//draw line
			context.lineTo( controlPoint.value * canvas.width, canvas.height - controlPoint.alpha * canvas.height );
			//add gradient stop
			let stopPos = Math.clamp( controlPoint.value - start, 0, 1 ) / widgetWidth;
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
	}
}

class CP_widget {
	constructor( options = {} ) {

		let panel = new Panel();
		let parent = null;
		this.color = new Color();

		panel.dom.id = 'cp-panel';
		panel.dom.classList.add( 'overlay', 'popup' );

		this.hidePanel = this.hide.bind( this );

		this.panel = panel;
		panel.dom.style.width = options.svPicker.size + options.hPicker.width + options.hPicker.pad + 4 + 'px';

		this.SVPicker = this.createSVPicker( this.color, options.svPicker );
		this.HPicker = this.createHPicker( this.color, options.hPicker );
		let inputFields = this.createInputFields( this.color );

		this.SVPicker.style.backgroundColor = "#FF0000";
	}

	hide() {
		this.panel.hide();

		if( this.parent ) { //remove previous parent
			this.color.removeCallback( this.parent );
		}
	}

	showAt( x, y, parent = null ) {
		if( parent ) this.parent = parent;

		this.panel.dom.style.top = y + 'px';
		this.panel.dom.style.left = x + 'px';
	}

	createSVPicker( color, options ) {
		let SVPicker = document.createElement( 'div' );
		SVPicker.className = 'field';
		SVPicker.width = options.size;
		SVPicker.height = options.size;
		SVPicker.style =   `float:left;
							height: ${ SVPicker.width }px;
							width: ${ SVPicker.height }px;
							background: linear-gradient( to right, #FFF, rgba( 255, 255, 255, 0 ) )`;
		this.panel.dom.appendChild( SVPicker );

		let SVPickerGradientOverlay = document.createElement( 'div' );
		SVPickerGradientOverlay.style =
			`margin: 0;
						   	padding: 0;
						   	float: left;
						   	height: 100%;
							width: 100%;
							background: linear-gradient( rgba( 0, 0, 0, 0 ), #000 )`;
		SVPicker.appendChild( SVPickerGradientOverlay );

		let SVPickerCursor = document.createElement( 'div' );
		SVPickerCursor.className = 'handle';
		SVPickerCursor.width = options.cursorRadius * 2;
		SVPickerCursor.height = options.cursorRadius * 2;
		SVPickerCursor.style =
			`height: ${ SVPickerCursor.height }px;
							width: ${ SVPickerCursor.width }px;				
    						border-radius: 50%;
    						position: relative;
    						top: -${ options.cursorRadius }px;
    						left: -${ options.cursorRadius }px`;
		SVPicker.appendChild( SVPickerCursor );

		let pickSV = function( e ) {
			e.preventDefault();

			let pos = UI.getRelativePosition( e.clientX, e.clientY, SVPicker );

			pos.x = Math.clamp( pos.x, 0, SVPicker.width );
			pos.y = Math.clamp( pos.y, 0, SVPicker.height );

			let saturation = pos.x / SVPicker.width;
			let value = 1 - ( pos.y / SVPicker.height );

			color.set( { s: saturation, v: value }, SVPicker );

			let cursorX = pos.x - options.cursorRadius;
			let cursorY = pos.y - options.cursorRadius;

			SVPickerCursor.style.left = cursorX + 'px';
			SVPickerCursor.style.top = cursorY + 'px';
		};

		let cp_widget = this;

		function onMouseUp() {
			//remove mousemove function
			document.removeEventListener( 'mousemove', pickSV );
			//hide color picker on next click in document
			document.addEventListener( 'mousedown', cp_widget.hidePanel, { once: true } );
		}

		function onMouseDown( e ) {
			e.preventDefault();
			pickSV( e );
			//add mousemove function (while mouse is down)
			document.addEventListener( 'mousemove', pickSV );
			//prevent panel from hiding while mouse is down
			document.removeEventListener( 'mousedown', cp_widget.hidePanel );

			document.addEventListener( 'mouseup', onMouseUp, { once: true } );
		}

		SVPicker.addEventListener( 'mousedown', onMouseDown );

		SVPicker.update = function( color ) {
			let hsv = color.getHSV();
			let rgb = Color.HSVtoRGB( hsv.h, 1, 1 );
			SVPicker.style.backgroundColor = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';

			let xPos = hsv.s * SVPicker.width;
			let yPos = ( 1 - hsv.v ) * SVPicker.height;

			let cursorX = xPos - options.cursorRadius;
			let cursorY = yPos - options.cursorRadius;

			SVPickerCursor.style.left = cursorX + 'px';
			SVPickerCursor.style.top = cursorY + 'px';
		};

		color.registerCallback( SVPicker, SVPicker.update );

		return SVPicker;
	}

	createHPicker( color, options ) {
		let HPicker = document.createElement( 'div' );
		HPicker.className = 'field';
		HPicker.width = options.width;
		HPicker.height = options.height;
		HPicker.style =    `float: right;
							margin-left: ${ options.pad }px;
						   	padding: 0;
							height: ${ HPicker.height }px;
							width: ${ HPicker.width }px;
							background: linear-gradient(#f00 0, #f0f 17%, #00f 33%, #0ff 50%, #0f0 67%, #ff0 83%, #f00 100%)`;

		this.panel.dom.appendChild( HPicker );

		let HPickerCursor = document.createElement( 'div' );
		HPickerCursor.className = 'handle';
		HPickerCursor.width = HPicker.width;
		HPickerCursor.height = options.cursorHeight;
		HPickerCursor.style =
			`position:relative;
						   	top: 0px;
						   	left: 0px;
						   	height: ${ HPickerCursor.height }px;
							width: ${ HPickerCursor.width }px`;
		HPicker.appendChild( HPickerCursor );

		let pickHue = function( e ) {
			e.preventDefault();

			let pos = UI.getRelativePosition( null, e.clientY, HPicker );

			//pos.y = Math.round( e.clientY - HPicker.getBoundingClientRect().top );
			pos.y = Math.clamp( pos.y, 0, HPicker.height );

			let hue = 1 - ( pos.y / HPicker.height );
			color.set( { h: hue }, HPicker );

			let cursorY = pos.y - ( HPickerCursor.height / 2 );
			HPickerCursor.style.top = cursorY + 'px';
		};


		let cp_widget = this;

		function onMouseUp() {
			//remove mousemove function
			document.removeEventListener( 'mousemove', pickHue );
			//hide color picker on next click in document
			document.addEventListener( 'mousedown', cp_widget.hidePanel, { once: true } );
		}

		function onMouseDown( e ) {
			e.preventDefault();
			pickHue( e );
			//add mousemove function (while mouse is down)
			document.addEventListener( 'mousemove', pickHue );
			//prevent panel from hiding while mouse is down
			document.removeEventListener( 'mousedown', cp_widget.hidePanel );

			document.addEventListener( 'mouseup', onMouseUp, { once: true } );
		}
		HPicker.addEventListener( 'mousedown', onMouseDown );

		HPicker.update = function( color ) {
			let hue = color.getHSV().h;

			let yPos = ( 1 - hue ) * HPicker.height;
			let cursorY = yPos - ( HPickerCursor.height / 2 );
			HPickerCursor.style.top = cursorY + 'px';
		};

		color.registerCallback( HPicker, HPicker.update );
		return HPicker;
	}

	createInputFields( color ) {
		let inputContainer = document.createElement( 'div' );
		inputContainer.height = 20;
		this.panel.dom.appendChild( inputContainer );
		inputContainer.style =
			`float: left;
			 height: ${ inputContainer.height }px;`;

		let inputWidth = Math.max( Math.floor( ( this.SVPicker.width / 3 ) - 5 ), 22 );

		let inputStyle =   `margin-top: 4px;
						    height: 12px;
						    width: ${ inputWidth }px;`;

		let inputs = [ 'r', 'g', 'b' ];
		let range = [ 0, 255 ];

		function inputEvent() {
			let value = Number( this.value );

			//constrain input to valid numbers
			value = Math.clamp( value, range[ 0 ], range[ 1 ] );
			if( value !== this.value ) this.value = value;
			let components = {};
			components[ this.name ] = value;
			color.set( components, inputContainer );
			//console.log('input changed to: ' + this.value + ' ' + this.name );
		}

		function pickColor() {
			color.set( { r: Number( inputs[ 0 ].value ), g: Number( inputs[ 1 ].value ), b: Number( inputs[ 2 ].value ) }, inputContainer );
		}

		for( let num = 0; num < inputs.length; num++ ) {
			let input = document.createElement( 'input' );
			input.type = 'number';
			input.min = range[ 0 ];
			input.max = range[ 1 ];
			input.step = 1;
			input.value = 255;
			input.title = inputs[ num ];
			input.name = inputs[ num ];
			input.style = inputStyle;
			if( num < inputs.length - 1 ) input.style.marginRight = '3px';
			inputContainer.appendChild( input );
			input.addEventListener( 'mousedown', function( e ) { e.stopPropagation(); } );
			input.addEventListener( 'input', inputEvent );
			inputs[ num ] = input;
		}

		inputContainer.update = function( color ) {
			let rgb = color.getRGB();
			inputs[ 0 ].value = rgb.r;
			inputs[ 1 ].value = rgb.g;
			inputs[ 2 ].value = rgb.b;
		};

		color.registerCallback( inputContainer, inputContainer.update );
	}
}

class ContextMenu {
	constructor( options = {} ) {
		let panel = new Panel();
		panel.dom.classList.add( 'menu', 'popup' );

		let itemsContainer = document.createElement( 'ul' );
		panel.dom.appendChild( itemsContainer );
		panel.dom.style.top = '0px';
		panel.dom.style.left = '0px';

		this.itemsContainer = itemsContainer;

		this.folders = new Map();

		this.panel = panel;
		this.hidePanel = this.hide.bind( this );

		this.caller = null;
	}

	addItems( items ) {
		for( let item of items ) {
			this.addItem( item );
		}
	}

	/**
	 * accepts four parameters or one object containing four params
	 */
	addItem( name, callback, folder = null, colors = null ) {
		if( typeof name === 'object' ) {
			colors = name.colors;
			folder = name.folder;
			callback = name.callback;
			name = name.name;
		}
		let item = document.createElement( 'li' );
		item.id = name;
		item.onmousedown = function( e ) { e.preventDefault(); callback( e ); };

		if( colors ) {
			item.style.height = '24px';
			item.style.width = '200px';
			item.style.margin = '3px 0px';
			item.style.background = 'linear-gradient(to right, ' + colors.join() + ')';
		}

		let link = document.createElement( 'a' );
		link.href = '#';
		link.target = '_self';
		link.innerHTML = name;

		item.appendChild( link );

		let parent = this.itemsContainer;

		if( folder && this.folders.get( folder ) ) parent = this.folders.get( folder );
		parent.appendChild( item );
	}

	addFolder( name ) {
		let folder = document.createElement( 'li' );
		folder.id = name;
		folder.class = 'hasSubMenu';

		let link = document.createElement( 'a' );
		link.href = '#';
		link.target = '_self';
		link.innerHTML = name;
		folder.appendChild( link );

		let itemsSubContainer = document.createElement( 'ul' );
		itemsSubContainer.class = 'submenu';
		itemsSubContainer.id = name + 'SubMenu';
		folder.appendChild( itemsSubContainer );

		this.itemsContainer.appendChild( folder );
		this.folders.set( name, itemsSubContainer );
	}

	showAt( x, y, caller = null ) {
		this.panel.dom.style.top = y + 'px';
		this.panel.dom.style.left = x + 'px';

		this.panel.show();
		this.caller = null;
	}

	hide() {
		this.panel.hide();
		this.caller = null;
	}
}