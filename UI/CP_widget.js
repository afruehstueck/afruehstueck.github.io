/**
 * @author afruehstueck
 */

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
	 * fires all registered callback functions on color change
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
	 * @param col HEX string (#FFFFFF or #FFF) OR RGB(A) string 'rgb(a)( 255, 255, 255 )' (alpha will be dropped) or Color object
	 * @returns {{r: r, g: g, b: b}} RGB object for parsed strings or the original RGB component for color objects
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
		}
	}

	/**
	 * convert RGB color to HEX color
	 * @param r red [ 0, 255 ] OR object { r: x, g: y, b: z }
	 * @param g green [ 0, 255 ]
	 * @param b blue [ 0, 255 ]
	 * @returns {string} converted color value in HEX
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
	 * @param hex string hex color value (6 digit hex #ffffff or shorthand 3 digit hex  #fff)
	 * @returns {{r, g, b}} converted color value as RGB object { r: red, g: green, b: blue }
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
	 * @param h hue OR object { h: x, s: y, v: z }
	 * @param s saturation
	 * @param v value
	 * @returns {{r, g, b}} converted color value as RGB object { r: red, g: green, b: blue }
	 * @constructor
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
	 * @param r red [ 0, 255 ] OR object { r: x, g: y, b: z }
	 * @param g green [ 0, 255 ]
	 * @param b blue [ 0, 255 ]
	 * @returns {{h, s, v}} converted color value as HSV object { h: hue, s: saturation, v: value }
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
 * CP_widget is the base class for the color picker widget
 */
class CP_widget {
	constructor( options = {} ) {

		let container = options.container || document.body;
		let panel = new Panel( { container: container } );
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
		this.panel.moveTo( x, y );
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
			//add mousemove function (while mouseEnd is down)
			document.addEventListener( 'mousemove', pickSV );
			//prevent panel from hiding while mouseEnd is down
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
			//add mousemove function (while mouseEnd is down)
			document.addEventListener( 'mousemove', pickHue );
			//prevent panel from hiding while mouseEnd is down
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
