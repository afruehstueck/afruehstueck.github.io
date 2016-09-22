/**
 * @author afruehstueck
 */

var svgNS = 'http://www.w3.org/2000/svg';

/**
 * add convenience function to Math for restricting range of a value
 */
Math.clamp = function( val, min, max ) { return Math.min( Math.max( min, val ), max ); };

/**
 * UI element - eventually replace with Steve's UI class
 */
class Panel {
	constructor( options = {} ) {
		var dom = document.createElement( 'div' );
		dom.className = 'panel';
		document.body.appendChild( dom );
		this.dom = dom;
	}
}

/**
 * helper class for creating SVG elements
 */
class SVG {
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

	static setColor( color ) {
		this.setAttribute( 'fill', color );
	}

	static createCircle( parent, cx, cy, fill = 'none', r = 7, stroke = '#aaa', strokeWidth = '2px' ) {
		let circle = document.createElementNS( svgNS, 'circle' );

		circle.setAttribute( 'class', 'circle' );
		circle.setAttribute( 'cx', cx );
		circle.setAttribute( 'cy', cy );
		circle.setAttribute( 'r', r );
		circle.setAttribute( 'fill', fill );
		circle.setAttribute( 'stroke', stroke );
		circle.setAttribute( 'stroke-width', strokeWidth );

		circle.data = {};
		circle.data.x = cx;
		circle.data.y = cy;
		circle.data.r = r;

		circle.set = this.set;
		circle.setColor = this.setColor;

		circle.parent = parent;
		circle.parent.appendChild( circle );
		return circle;
	}

	static createRect( parent, x, y, fill = 'black', w = 12, h = 12, stroke = '#aaa', strokeWidth = '3px' ) {
		let rect = document.createElementNS( svgNS, 'rect' );
		rect.setAttribute( 'class', 'rect' );
		rect.setAttribute( 'x', x );
		rect.setAttribute( 'y', y );
		rect.setAttribute( 'width', w );
		rect.setAttribute( 'height', h );
		rect.setAttribute( 'fill', fill );
		rect.setAttribute( 'stroke', stroke );
		rect.setAttribute( 'stroke-width', strokeWidth );

		rect.data = {};
		rect.data.x = x;
		rect.data.y = y;
		rect.data.width = w;
		rect.data.height = h;

		rect.set = this.set;
		rect.setColor = this.setColor;

		rect.parent = parent;
		rect.parent.appendChild( rect );
		return rect;
	}
}

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
			g = r.g, b = r.b, r = r.r;
		}
		let hex = '#' + ( ( 1 << 24 ) + ( r << 16 ) + ( g << 8 ) + b ).toString( 16 ).slice( 1 );
		return hex;
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
 * options.*:
 * width:			number
 * height: 			number
 */
class TF_panel {
	constructor( parent, options = {} ) {
		this.parent = parent;
		this.options = options;

		this.callbacks = [];

		//parent dom element of TF panel
		let panel = new Panel();

		panel.dom.id = 'tf-panel';
		panel.dom.classList.add( 'overlay' );
		this.panel = panel;
		panel.width = options.width || 800;
		panel.height = options.height || 200;

		//canvas for drawing background histogram
		let canvas = document.createElement( 'canvas' );
		canvas.width = panel.width;
		canvas.height = panel.height;
		canvas.id = 'histogram-canvas';
		this.panel.dom.appendChild( canvas );
		this.canvas = canvas;

		//underlying data
		let data = this.parent.data;
		if ( data !== this.data ) {
			options.stats = { bins: this.canvas.width / 5 };
			this.data = data;
			this.statistics = this.calcStatistics();
			this.histogram = this.statistics.histogram;
			this.updateHistogram = true;
		}

		//create SVG context for interaction elements
		let svgContext = document.createElementNS( svgNS, 'svg' );
		svgContext.setAttribute( 'xmlns', svgNS );
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

		let self = this;
		//show tooltips on hover over tf panel
		svgContext.addEventListener( 'mousemove', function( e ) {
			let binWidth = this.canvas.width / this.statistics.bins;
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
		this.addWidget();

		//add color picker
		let cp_widget = new CP_widget();
		this.panel.cp_widget = cp_widget;

		/*document.addEventListener( 'mouseup', function() {
			console.log( 'clicked outside!' );
			cp_widget.hide();
		}, false );
*/
		this.draw();
	}

	addWidget( options ) {
		let widget = new TF_widget( this.panel, options );
		let self = this;
		widget.registerCallback( this.fireChange.bind( self ) );
		this.widgets.push( widget );
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
			this.drawHistogram();
			this.updateHistogram = false;
		}
		for( let widget of this.widgets ) {
			widget.drawWidget();
		}
	}

	/**
	 * calculates the statistics for an array of data values necessary for displaying the histogram
	 *
	 * options.stats.*:
	 * bins:		number
	 * range:		{ min: number, max: number }
	 */
	calcStatistics() {
		let statistics = {};
		let data = this.data;
		let options = this.options.stats || {};

		statistics.bins = options.bins || 250;

		statistics.range = options.range;

		if( !statistics.range ) {
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
		}

		let histogram = new Int32Array( statistics.bins );
		let binScale = statistics.bins / ( statistics.range.max - statistics.range.min );

		for( let index = 0; index < data.length; index++ ) {
			let bin = Math.floor( ( data[ index ] - statistics.range.min ) * binScale );
			histogram[ bin ] += 1;
		}
		statistics.histogram = histogram;

		statistics.maxBin = 0;
		statistics.maxBinValue = 0;
		for ( let bin = 0; bin < statistics.bins; bin++ ) {
			if (statistics.histogram[ bin ] > statistics.maxBinValue ) {
				statistics.maxBin = bin;
				statistics.maxBinValue = statistics.histogram[ bin ];
			}
		}

		return( statistics );
	}

	/* draw the histogram to the histogram canvas
	 *
	 * options.histogram.*:
	 * fillColor:		color
	 * lineColor:		color
	 * style:			{ 'polygon', 'line' }
	 * scale:			function (e.g. logarithmic, ...)
	 * overlayUnscaled:	boolean
	 */
	drawHistogram() {
		let data = this.parent.data;
		if ( !data ) {
			return;
		}

		let options = this.options.histogram || {};

		let canvas = this.canvas;
		let context = canvas.getContext( '2d' );
		context.clearRect( 0, 0, canvas.width, canvas.height );
		context.fillStyle = options.fillColor || 'black';
		context.fillRect( 0, 0, canvas.width, canvas.height );
		context.fillStyle = options.fillColor || '#333';

		let xScale = canvas.width / this.statistics.bins;

		/* plots the histogram bins as a polygon that traces the centers of each bin */
		let drawPolygonHistogram = function ( scale ) {
			scale = scale || Math.log;

			context.beginPath();
			let maxVal = scale( this.statistics.maxBinValue );

			context.moveTo( 0, canvas.height );
			context.lineTo( 0, canvas.height - canvas.height * scale( this.statistics.histogram[ 0 ] ) / maxVal );

			let x = xScale / 2;
			for( let bin = 0; bin < this.statistics.bins; bin++ ) {
				context.lineTo( x, canvas.height - canvas.height * scale( this.statistics.histogram[ bin ] ) / maxVal );
				x += xScale;
			}
			context.lineTo( canvas.width, canvas.height - canvas.height * scale( this.statistics.histogram[ this.statistics.bins - 1 ] ) / maxVal );
			context.lineTo( canvas.width, canvas.height );
			context.lineTo( 0, canvas.height );

			context.closePath();
			context.fill();

			context.strokeStyle = options.lineColor || '#666';
			context.stroke();
		};

		/* plots the histogram bins as a series of n vertical lines (n = number of bins) */
		let drawLineHistogram = function( scale ) {
			scale = scale || Math.log;

			let maxVal = scale( this.statistics.maxBinValue );
			context.beginPath();

			for( let bin = 0; bin < this.statistics.bins; bin++ ) {
				context.moveTo( xScale * bin, canvas.height );
				context.lineTo( xScale * bin, canvas.height - ( canvas.height * scale( this.statistics.histogram[ bin ] ) ) / maxVal );
			}

			context.closePath();
			context.strokeStyle = options.lineColor || '#444';
			context.lineWidth = xScale;
			context.stroke();
		};

		let style = options.style || 'polygon';
		let scale = options.scale || Math.log;
		this.histogram.scale = scale;
		let overlayUnscaled = options.overlayUnscaled || true;
		let identityFunction = function( x ) { return x; };
		if( overlayUnscaled ) {
			context.globalAlpha = 0.6;
		}
		if( style === 'polygon' ) {
			drawPolygonHistogram.call( this, scale );
			if( overlayUnscaled ) {
				drawPolygonHistogram.call( this, identityFunction );
			}
		} else if( style === 'line' ) {
			drawLineHistogram.call( this, scale );
			if( overlayUnscaled ) {
				drawLineHistogram.call( this, identityFunction );
			}
		}
	}

	TFtoIMG() {
			var img = document.createElement( 'img' );
			let tfCanvas = document.createElement( 'canvas' );
			tfCanvas.height = 30;
			tfCanvas.width = 256;

			let ctx = tfCanvas.getContext( '2d' );


			for( let widget of this.widgets ) {
				let gradient = ctx.createLinearGradient( 0, 0, tfCanvas.width, 0 );

				let leftBorder = 1, rightBorder = 0;
				for( let controlPoint of widget.controlPoints ) {
					if( controlPoint.value < leftBorder ) leftBorder = controlPoint.value;
					if( controlPoint.value > rightBorder ) rightBorder = controlPoint.value;
				}
				let width = rightBorder - leftBorder;

				for( let controlPoint of widget.controlPoints ) {
					let rgbColor = Color.parseColor( controlPoint.color );
					let rgbaColorString = 'rgba( ' + rgbColor.r + ', ' + rgbColor.g + ', ' + rgbColor.b + ', ' + controlPoint.alpha + ')';
					gradient.addColorStop( ( controlPoint.value - leftBorder ) / width, rgbaColorString );
					console.log( 'color ' + rgbaColorString + ' at ' + ( controlPoint.value - leftBorder ) / width );
				}

				ctx.fillStyle = gradient;
				ctx.fillRect( leftBorder * tfCanvas.width, 0, ( rightBorder - leftBorder ) * tfCanvas.width, tfCanvas.height )
			}

			img.src = tfCanvas.toDataURL();
			return img;
	}
}

/* TF-widget contains one range of two or more control points
 *
 * options.*:
 * location:		number
 * controlPoints:	array of { value: number, alpha: number, color: color }
 * opacity:			number
 */
class TF_widget {
	constructor( parent, options = {} ) {
		this.parent = parent;

		let canvas = document.createElement( 'canvas' );
		this.canvas = canvas;
		canvas.width = parent.width;
		canvas.height = parent.height;
		canvas.className = 'tf-widget-canvas overlay';
		canvas.style.opacity = options.opacity || 0.7;
		//insert canvases below UI svg context
		parent.dom.insertBefore( canvas, parent.svgContext );

		let location = options.location || 0.5;
		let controlPoints = options.controlPoints || [];
		this.controlPoints = controlPoints;

		this.callbacks = [];

		if( controlPoints.length === 0 ) {
			//add default points
			this.addControlPoint( location + 0.0, 0.00, '#000000' );
			this.addControlPoint( location + 0.1, 0.25, '#3333ff' );
			this.addControlPoint( location + 0.2, 0.40, '#3366ff' );
			this.addControlPoint( location + 0.3, 0.80, '#ffffff' );
		}

		let anchor = SVG.createRect( this.parent.svgContext, 0, 0 );
		anchor.classList.add( 'handle' );
		this.anchor = anchor;

		let self = this;
		let repaint = this.drawWidget.bind( self );
		let moveFunction = moveAnchor.bind( self );
		anchor.moveLock = 'N';

		/* moves anchor on mousemove while mouse down */
		function moveAnchor( e ) {
			e.preventDefault();
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
			
			for( let controlPoint of controlPoints ) {
				this.updateControlPoint( controlPoint, controlPoint.handle.data.x - offsetX, controlPoint.handle.data.y - offsetY );
			}

			//remove mouse move event on mouseup
			document.addEventListener( 'mouseup', function() {
				this.anchor.moveLock = 'N';
				parent.dom.classList.remove( 'drag' );
				document.removeEventListener( 'mousemove', moveFunction, false );
			}.bind( self ), true );

			repaint();
		}

		//add mouse move event when mouse is pressed
		anchor.addEventListener( 'mousedown', function( e ) {
			e.preventDefault();
			document.addEventListener( 'mousemove', moveFunction, false );
		}, true );

		this.updateAnchor();
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

	addControlPoint( value, alpha, color ) {
		let parent = this.parent;
		let controlPoint = { value: value, alpha: alpha, color: color };

		let handle = SVG.createCircle( this.parent.svgContext, value * this.canvas.width, this.canvas.height - alpha * this.canvas.height, controlPoint.color );
		handle.classList.add( 'handle' );

		let width = this.parent.width,
			height = this.parent.height;

		let self = this;
		let update = this.updateWidget.bind( self );
		let repaint = this.drawWidget.bind( self );
		let moveFunction = moveHandle.bind( self );

		/* moves control point handles on mousemove while mouse down */
		function moveHandle( e ) {
			//restrict area of movement for control points
			//todo this is not handled very well yet
			if( e.pageX < 0 || e.pageX > width || e.pageY < 0 || e.pageY > height ) return;

			this.updateControlPoint( controlPoint, e.pageX, e.pageY );

			//remove mouse move event on mouseup
			document.addEventListener( 'mouseup', function() {
				document.removeEventListener( 'mousemove', moveFunction, false );
			} );

			//update widget through callback function
			update();
		}

		//add mouse move event when mouse is pressed
		handle.addEventListener( 'mousedown', function( e ) {
			e.preventDefault();
			document.addEventListener( 'mousemove', moveFunction, false );
		} );

		handle.addEventListener( 'dblclick', function( e ) {
			e.preventDefault();
			console.log( 'doubleclick!' );
			parent.cp_widget.attachTo( handle, e.pageX, e.pageY );
			parent.cp_widget.color.registerCallback( handle, function( col ) {
				let colHex = Color.RGBtoHEX( col.rgb );
				handle.setColor( colHex )
				controlPoint.color = colHex;
				repaint();
			} );
			parent.cp_widget.color.set( controlPoint.color, handle );
			parent.cp_widget.show();

			document.removeEventListener( 'mousemove', moveFunction, false );
		} );

		controlPoint.handle = handle;
		this.controlPoints.push( controlPoint );
	}

	updateControlPoint( controlPoint, x = null, y = null ) {
		//update position of svg
		if( x ) {
			//restrict x coordinate to [ 0, width ]
			x = Math.clamp( x, 0, this.parent.width );
			controlPoint.value = x / this.parent.width;
		}
		if( y ) {
			//restrict y coordinate to [ 0, height ]
			y = Math.clamp( y, 0, this.parent.height );
			controlPoint.alpha = 1.0 - ( y / this.parent.height );
		}
		controlPoint.handle.set( x, y );
	}

	deleteControlPoint( value ) {
		let index = this.controlPoints.findIndex( point => point.value === value );

		if( index > -1 ) {
			this.parent.svgContext.removeChild( this.controlPoints[ index ].handle );
			this.controlPoints.splice( index, 1 );
		}

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
		let right = {}, left = {};
		for( let controlPoint of controlPoints ) {
			right = controlPoint;
			if( controlPoint.value > anchorValue ) {
				break;
			}
			left = right;
		}

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

		controlPoints.sort( ( a, b ) => ( a.value > b.value ) );

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

		let leftPoint = controlPoints[ 0 ].value;
		let rightPoint = controlPoints[ controlPoints.length - 1 ].value;
		let context = canvas.getContext( '2d' );

		context.clearRect( 0, 0, canvas.width, canvas.height );
		context.beginPath();
		context.moveTo( leftPoint * canvas.width, canvas.height );

		let widgetWidth = rightPoint - leftPoint;
		var gradient = context.createLinearGradient( leftPoint * canvas.width, 0, rightPoint * canvas.width, 0 ); //horizontal gradient

		for( let controlPoint of controlPoints ) {
			context.lineTo( controlPoint.value * canvas.width, canvas.height - controlPoint.alpha * canvas.height );
			let stopPos = ( controlPoint.value - leftPoint ) / widgetWidth;
			gradient.addColorStop( stopPos, controlPoint.color );
		}

		context.lineTo( rightPoint * canvas.width, canvas.height );
		context.lineTo( leftPoint * canvas.width, canvas.height );

		context.closePath();

		context.fillStyle = gradient;
		context.fill();

		context.strokeStyle = '#aaa';
		context.lineWidth = 2;
		context.stroke();

		this.fireChange();
		//propagate change to callbacks
	}
}

/**
 * options.svPicker.*:
 * size:		number
 * cursorRadius:number
 *
 * options.hPicker.*:
 * width:		number
 * cursorHeight:number
 * pad:			number
 */
class CP_widget {
	constructor( options = {} ) {

		options.svPicker = options.svPicker || {};
		options.svPicker.size = options.svPicker.size || 128;
		options.svPicker.cursorRadius = options.svPicker.cursorRadius || 3;

		options.hPicker = options.hPicker || {};
		options.hPicker.width = options.hPicker.width || Math.clamp( options.svPicker.size / 5, 10, 25 );
		options.hPicker.height = options.svPicker.size;
		options.hPicker.pad = options.hPicker.pad || 4;
		options.hPicker.cursorHeight = options.hPicker.cursorHeight || 4;

		let panel = new Panel();
		let parent = null;
		this.color = new Color();

		panel.dom.id = 'cp-panel';
		panel.dom.classList.add( 'overlay', 'popup' );
		this.panel = panel;
		panel.dom.style.width = options.svPicker.size + options.hPicker.width + options.hPicker.pad + 4 + 'px';

		this.SVPicker = this.createSVPicker( this.color, options.svPicker );
		this.HPicker = this.createHPicker( this.color, options.hPicker );
		let inputFields = this.createInputFields( this.color );

		this.SVPicker.style.backgroundColor = "#FF0000";
	}

	attachTo( parent, x, y ) {
		//todo refactor this
		if( this.parent ) { //remove previous parent
			this.color.removeCallback( this.parent );
		}
		this.parent = parent;

		this.panel.dom.style.top = y + 'px';
		this.panel.dom.style.left = x + 'px';
	}

	toggle() {
		this.panel.dom.style.visibility = ( this.panel.dom.style.visibility === 'hidden' ) ? 'visible' : 'hidden';
	}

	hide() {
		this.panel.dom.style.visibility = 'hidden';
	}

	show() {
		this.panel.dom.style.visibility = 'visible';
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

			let xPos = e.clientX - Math.floor( SVPicker.getBoundingClientRect().left );
			let yPos = e.clientY - Math.floor( SVPicker.getBoundingClientRect().top );

			xPos = Math.clamp( xPos, 0, SVPicker.width );
			yPos = Math.clamp( yPos, 0, SVPicker.height );

			let saturation = xPos / SVPicker.width;
			let value = 1 - ( yPos / SVPicker.height );

			color.set( { s: saturation, v: value }, SVPicker );

			let cursorX = xPos - options.cursorRadius;
			let cursorY = yPos - options.cursorRadius;

			SVPickerCursor.style.left = cursorX + 'px';
			SVPickerCursor.style.top = cursorY + 'px';
		};

		SVPicker.addEventListener( 'mousedown', function( e ) {
			e.preventDefault();
			pickSV( e );
			document.addEventListener( 'mousemove', pickSV );
		}, true );

		document.addEventListener( 'mouseup', function( e ) {
			e.preventDefault();
			document.removeEventListener( 'mousemove', pickSV );
		} );

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

			let yPos = Math.round( e.clientY - HPicker.getBoundingClientRect().top );
			yPos = Math.clamp( yPos, 0, HPicker.height );

			let hue = 1 - ( yPos / HPicker.height );
			color.set( { h: hue }, HPicker );

			let cursorY = yPos - ( HPickerCursor.height / 2 );
			HPickerCursor.style.top = cursorY + 'px';
		};

		HPicker.addEventListener( 'mousedown', function( e ) {
			e.preventDefault();
			pickHue( e );
			document.addEventListener( 'mousemove', pickHue );
		}, true );

		document.addEventListener( 'mouseup', function( e ) {
			e.preventDefault();
			document.removeEventListener( 'mousemove', pickHue );
		} );

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
		inputContainer.style =
			`float: left;
						    height: ${ inputContainer.height }px;`;
		this.panel.dom.appendChild( inputContainer );

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
			input.addEventListener('input', inputEvent);
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