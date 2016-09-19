/**
 * @author afruehstueck
 */

var svgNS = 'http://www.w3.org/2000/svg';

/*
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

/*
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

		rect.parent = parent;
		rect.parent.appendChild( rect );
		return rect;
	}
}

/*
 * TF_panel is the base class for the transfer function panel
 * contains the container DIV (panel), the histogram canvas, one or multiple TF_widgets, the SVG context for UI elements
 * OPTIONS.*:
 * width:			number
 * height: 			number
 */
class TF_panel {
	constructor( parent, options = {} ) {
		this.parent = parent;
		this.options = options;

		let panel = new Panel();

		panel.dom.id = 'tf-panel';
		panel.dom.classList.add( 'overlay' );
		this.panel = panel;
		panel.width = options.width || 800;
		panel.height = options.height || 200;

		let canvas = document.createElement( 'canvas' );
		canvas.width = panel.width;
		canvas.height = panel.height;
		canvas.id = 'histogram-canvas';
		this.panel.dom.appendChild( canvas );
		this.canvas = canvas;

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
	}

	addWidget( options ) {
		this.widgets.push( new TF_widget( this.panel, options ) );
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

	/*
	 * calculates the statistics for an array of data values necessary for displaying the histogram
	 *
	 * OPTIONS.STATS.*:
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
	 * OPTIONS.HISTOGRAM.*:
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
}

/* TF-widget contains one range of two or more control points
 *
 * OPTIONS.*:
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
		let callback = this.drawWidget.bind( self );
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

			callback();
		}

		//add mouse move event when mouse is pressed
		anchor.addEventListener( 'mousedown', function() {
			document.addEventListener( 'mousemove', moveFunction, false );
		}, true );

		this.updateAnchor();
	}

	addControlPoint( value, alpha, color ) {
		let controlPoint = { value: value, alpha: alpha, color: color };

		let handle = SVG.createCircle( this.parent.svgContext, value * this.canvas.width, this.canvas.height - alpha * this.canvas.height, controlPoint.color );
		handle.classList.add( 'handle' );

		let width = this.parent.width,
			height = this.parent.height;

		let self = this;
		let callback = this.updateWidget.bind( self );
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
			}, true );

			//update widget through callback function
			callback();
		}

		//add mouse move event when mouse is pressed
		handle.addEventListener( 'mousedown', function() {
			document.addEventListener( 'mousemove', moveFunction, false );
		}, true );

		//handle.addEventListener( 'dblclick', function() { console.log( 'doubleclick!' ) } );

		controlPoint.handle = handle;
		this.controlPoints.push( controlPoint );

		$( handle ).colorPicker( {
			color: controlPoint.color,
			customBG: '#222',
			margin: '4px 2px 0',
			doRender: 'div div',
			buildCallback: function( $elm ) {
				var colorInstance = this.color,
					colorPicker = this;
				$elm.prepend('<div class="cp-panel">' +
					'R <input type="text" class="cp-r" /><br>' +
					'G <input type="text" class="cp-g" /><br>' +
					'B <input type="text" class="cp-b" /><hr>' +
					'H <input type="text" class="cp-h" /><br>' +
					'S <input type="text" class="cp-s" /><br>' +
					'B <input type="text" class="cp-v" /><hr>' +
					'<input type="text" class="cp-HEX" />' +
					'</div>').on('change', 'input', function(e) {
						var value = this.value,
							className = this.className,
							type = className.split('-')[1],
							color = {};

						color[type] = value;
						colorInstance.setColor( type === 'HEX' ? value : color,
							type === 'HEX' ? 'HEX' : /(?:r|g|b)/.test(type) ? 'rgb' : 'hsv' );
						colorPicker.render();
						this.blur();
					});
			},
			cssAddon: // could also be in a css file instead
				'.cp-color-picker{box-sizing:border-box; width:226px;}' +
				'.cp-color-picker .cp-panel {line-height: 21px; float:right;' +
				'padding:0 1px 0 8px; margin-top:-1px; overflow:visible}' +
				'.cp-xy-slider:active {cursor:none;}' +
				'.cp-panel, .cp-panel input {color:#bbb; font-family:monospace,' +
				'"Courier New",Courier,mono; font-size:12px; font-weight:bold;}' +
				'.cp-panel input {width:28px; height:12px; padding:2px 3px 1px;' +
				'text-align:right; line-height:12px; background:transparent;' +
				'border:1px solid; border-color:#222 #666 #666 #222;}' +
				'.cp-panel hr {margin:0 -2px 2px; height:1px; border:0;' +
				'background:#666; border-top:1px solid #222;}' +
				'.cp-panel .cp-HEX {width:44px; position:absolute; margin:1px -3px 0 -2px;}' +
				'.cp-alpha {width:155px;}',
			opacity: false,
			renderCallback: function( $elm, toggled ) {
				var colors = this.color.colors.RND,
					modes = {
						r: colors.rgb.r, g: colors.rgb.g, b: colors.rgb.b,
						h: colors.hsv.h, s: colors.hsv.s, v: colors.hsv.v,
						HEX: this.color.colors.HEX
					};

				$( 'input', '.cp-panel' ).each( function() {
					this.value = modes[ this.className.substr(3) ];
				});
			}
		});
	}

	updateControlPoint( controlPoint, x = null, y = null ) {
		//update position of svg
		if( x ) {
			//restrict x coordinate to [ 0, width ]
			x = Math.max( Math.min( x, this.parent.width ), 0 );
			controlPoint.value = x / this.parent.width;
		}
		if( y ) {
			//restrict y coordinate to [ 0, height ]
			y = Math.max( Math.min( y, this.parent.height ), 0 );
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

	/*
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

	/*
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
	}
}

class CP_widget {
	constructor( options = {} ) {
		let panel = new Panel();

		panel.dom.id = 'cp-panel';
		panel.dom.classList.add( 'temporary', 'popup' );
		this.panel = panel;
		panel.width = options.width || 300;
		panel.height = options.height || 150;

		/*let canvas = document.createElement( 'canvas' );
		this.canvas = canvas;
		canvas.width = parent.width;
		canvas.height = parent.height;
		canvas.className = 'cp-widget-canvas overlay';
		*/
		//insert canvases below UI svg context

		let SLPicker = document.createElement( 'div' );
		SLPicker.width = 128;
		SLPicker.height = 128;
		SLPicker.style =   `float:left;
							height: 128px;
							width: 128px;
							background: linear-gradient( to right, #FFF, rgba( 255, 255, 255, 0 ) )`;
		panel.dom.appendChild( SLPicker );

		let SLPickerGradientOverlay = document.createElement( 'div' );
		SLPickerGradientOverlay.width = 128;
		SLPickerGradientOverlay.height = 128;
		SLPickerGradientOverlay.style =
						   `height: 100%;
							width: 100%;
							background: linear-gradient( rgba( 0, 0, 0, 0 ), #000 )`;
		SLPicker.appendChild( SLPickerGradientOverlay );
		
		let HPicker = document.createElement( 'div' );
		HPicker.width = 20;
		HPicker.height = 128;
		HPicker.style =    `float: right;
							margin-left: 6px;
							height: 128px;
							width: 20px;
							background: linear-gradient(red 0, #f0f 17%, #00f 33%, #0ff 50%, #0f0 67%, #ff0 83%, red 100%)`;

		panel.dom.appendChild( HPicker );

		SLPicker.style.backgroundColor = "#D93600";
	}
}