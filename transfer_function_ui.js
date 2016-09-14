/**
 * @author afruehstueck
 */
var svgNS = 'http://www.w3.org/2000/svg';

class Panel {
	constructor( options = {} ) {
		var dom = document.createElement( 'div' );
		dom.className = 'panel overlay';
		document.body.appendChild( dom );
		this.dom = dom;
	}
}

/*
 * OPTIONS.*:
 * width: number
 * height: number
 * */
class TF_panel {
	constructor( parent, options = {} ) {
		this.parent = parent;
		this.options = options;

		let panel = new Panel();
		this.panel = panel;
		panel.width = options.width || 800;
		panel.height = options.height || 250;

		let canvas = document.createElement( 'canvas' );
		canvas.width = panel.width;
		canvas.height = panel.height;
		canvas.id = 'tf-canvas';
		this.panel.dom.appendChild( canvas );
		this.canvas = canvas;

		let svg = document.createElementNS( svgNS, 'svg' );
		svg.setAttribute( 'xmlns', svgNS );
		svg.setAttribute( 'xmlns:xlink', 'http://www.w3.org/1999/xlink' );
		svg.setAttribute( 'width', panel.width );
		svg.setAttribute( 'height', panel.height );
		svg.setAttribute( 'id', 'tf-svg' );
		svg.setAttribute( 'class', 'overlay' );
		this.panel.svg = svg;
		/*
		 svg.width = panel.width;
		 svg.height = panel.height;
		 svg.id = 'tf-svg';
		 svg.className = 'overlay';
		 */

		let widgets = [];
		widgets.push( new TF_widget( panel ) );
		this.widgets = widgets;

		this.panel.dom.appendChild( svg );
	}

	addWidget( options ) {
		this.widgets.push( new TF_widget( this.panel, options ) );
	}

	draw() {
		this.drawHistogram();
		for( let widget of this.widgets ) {
			widget.drawWidget();
		}
	}

	/*
	 * OPTIONS.STATS.*:
	 * bins: number
	 * range: { min: number, max: number }
	 * */
	calcStatistics() {
		let statistics = {};
		let data = this.data;
		let options = this.options.stats || {};
		//let options = this.options.stats || {};

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

	/*
	 * OPTIONS.HISTOGRAM.*:
	 * fillColor: color
	 * lineColor: color
	 * style: { 'polygon', 'line' }
	 * scale: function (e.g. logarithmic, ...)
	 * overlayUnscaled: boolean
	 * */
	drawHistogram() {
		let data = this.parent.data;
		let options = this.options.histogram || {};
		if ( !data ) {
			return;
		}

		if ( data !== this.data ) {
			options.stats = { bins: this.canvas.width / 10 };
			this.data = data;
			this.statistics = this.calcStatistics();
			this.histogram = this.statistics.histogram;
		}

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
			context.lineTo( canvas.width, canvas.height - canvas.height *scale( this.statistics.histogram[ this.statistics.bins - 1 ] ) / maxVal );
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

let SVG = {
	createCircle( panel, cx, cy, fill = 'none', r = 7, stroke = '#aaa', strokeWidth = '2px' ) {
		let circle = document.createElementNS( svgNS, 'circle' );
		circle.setAttribute( 'class', 'circle' );
		circle.setAttribute( 'cx', cx );
		circle.setAttribute( 'cy', cy );
		circle.setAttribute( 'r', r );
		circle.setAttribute( 'fill', fill );
		circle.setAttribute( 'stroke', stroke );
		circle.setAttribute( 'stroke-width', strokeWidth );

		circle.parent = panel.svg;
		panel.svg.appendChild( circle );
		return circle;
	}
};

/*
 * OPTIONS.*:
 * location: number
 * controlPoints: array of { value: number, alpha: number, color: color }
 * opacity: number
 * */
class TF_widget {
	constructor( parent, options = {} ) {
		let canvas = document.createElement( 'canvas' );
		canvas.width = parent.width;
		canvas.height = parent.height;
		canvas.className = 'tf-widget-canvas overlay';
		canvas.style.opacity = options.opacity || 0.7;
		parent.dom.appendChild( canvas );
		this.parent = parent;
		this.canvas = canvas;

		let location = options.location || 0.5;
		this.controlPoints = options.controlPoints || [];

		if( this.controlPoints.length === 0 ) {
			//add default points
			this.addControlPoint( location + 0.0, 0.00, '#000000' );
			this.addControlPoint( location + 0.1, 0.25, '#3333ff' );
			this.addControlPoint( location + 0.2, 0.40, '#3366ff' );
			this.addControlPoint( location + 0.3, 0.80, '#ffffff' );
		}

		/*for( let controlPoint of this.controlPoints ) {
		 controlPoint.handle = SVG.createCircle( this.parent, controlPoint.value * this.canvas.width, this.canvas.height - controlPoint.alpha * this.canvas.height, controlPoint.color );
		 }*/
	}

	addControlPoint( value, alpha, color ) {
		let controlPoint = { value: value, alpha: alpha, color: color };

		let handle = SVG.createCircle( this.parent, value * this.canvas.width, this.canvas.height - alpha * this.canvas.height, controlPoint.color );

		let width = this.parent.width,
			height = this.parent.height;
		let callback = this.updateWidget.bind( this );

		function moveHandle( e ) {
			if( e.pageX < 0 || e.pageX > width || e.pageY < 0 || e.pageY > height ) return;

			controlPoint.value = e.pageX / width;
			controlPoint.alpha = 1.0 - ( e.pageY / height );

			console.log( controlPoint.value + ',' + controlPoint.alpha );
			handle.setAttribute( 'cx', e.pageX );
			handle.setAttribute( 'cy', e.pageY );

			handle.addEventListener( 'mouseup', function() {
				document.removeEventListener( 'mousemove', moveHandle, false );
			}, true );

			callback();
		}

		handle.addEventListener( 'mousedown', function( e ) {
			document.addEventListener( 'mousemove', moveHandle, false );
		}, true );

		controlPoint.handle = handle;
		this.controlPoints.push( controlPoint );
		this.controlPoints.sort( ( a, b ) => ( a.value > b.value ) );
	}

	deleteControlPoint( value ) {
		let index = this.controlPoints.findIndex( point => point.value === value );

		if( index > -1 ) {
			this.parent.svg.removeChild( this.controlPoints[ index ].handle );
			this.controlPoints.splice( index, 1 );
		}

	}

	updateWidget() {
		//sort controlPoints by ascending value
		this.controlPoints.sort( ( a, b ) => ( a.value > b.value ) );
		//redraw
		this.drawWidget();
	}

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