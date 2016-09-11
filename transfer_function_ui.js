/**
 * @author afruehstueck
 */


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

		this.panel = new Panel();


		let canvas = document.createElement( 'canvas' );
		canvas.width = options.width || 800;
		canvas.height = options.height || 250;
		canvas.id = 'tf-canvas';
		this.panel.dom.appendChild( canvas );
		this.canvas = canvas;
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
			this.statistics = statistics( data, options.stats );
			this.histogram = statistics.histogram;
			this.data = data;
		}

		let canvas = this.canvas;
		let context = canvas.getContext( '2d' );
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

class TF_range {
	constructor() {
		this.controlPoints = [];
	}

	addControlPoint( value, alpha ) {
		controlPoints.append( { value: value, alpha: alpha } );
	}

	deleteControlPoint( value ) {
		controlPoints.splice( controlPoints.find( point => point.value === value ), 1 );
	}
}


/*
 * OPTIONS.STATS.*:
 * bins: number
 * range: { min: number, max: number }
 * */
function statistics( data, options = {} ) {
	let statistics = {};

	//let options = this.options.stats || {};
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