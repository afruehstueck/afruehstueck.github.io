/**
 * @author afruehstueck
 */

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
		 * isCollapsible	boolean				describes whether collapsible sidebar should be used
		 */
		options.parent = options.parent || document.body;
		options.panel = options.panel || {};
		options.panel.width = options.panel.width || 600;
		options.panel.height = options.panel.height || 120;
		options.panel.isCollapsible = options.panel.isCollapsible || false;

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
			options.widgets[ index ].location = options.widgets[ index ].location || null;
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

	constructor( options = {} ) {
		let self = this;

		this.options = this.parseOptions( options );
		this.parent = options.parent || document.body;

		this.callbacks = [];

		let container = options.container || parent.parentElement || null;

		let collapsiblePanel;
		if( this.options.panel.isCollapsible ) {
			collapsiblePanel = new Panel( { container: container } );
			collapsiblePanel.dom.id = 'tf-collapsible';
			collapsiblePanel.dom.style.position = 'absolute';
			collapsiblePanel.moveTo( 0, 0 );
			collapsiblePanel.dom.style.transform = 'translateX(-100%)';

			let collapsibleText = document.createElement( 'div' );
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
		let panel = new Panel( { container: container } );

		if( this.options.panel.isCollapsible ) {
			collapsiblePanel.dom.onclick = panel.toggle.bind( panel );
		}

		panel.dom.id = 'tf-panel';
		panel.dom.classList.add( 'overlay' );
		panel.dom.style.left = this.options.panel.isCollapsible ? '24px' : '0px';
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

		this.options.gradientPresets.container = this.panel.dom;
		this.panelContextMenu = this.addContextMenu( this.options.gradientPresets );

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

		//add tf_widgets

		this.widgets = [];
		for( let widgetOptions of this.options.widgets ) {
			this.addWidget( widgetOptions );
		}
		if( this.options.widgets.length === 0 ) {
			this.addWidget(); //add one default widget
		}

		//add color picker
		options.colorpicker.container = panel.dom;
		let cp_widget = new CP_widget( this.options.colorpicker );
		panel.cp_widget = cp_widget;

		this.draw();

		/*svgContext.addEventListener( 'mousedown', onMouseDown );

		let boundMouseMove = onMouseMove.bind( self );
		function onMouseDown( e ) {
			self.mouseStart = UI.getRelativePosition( e.clientX, e.clientY, self.panel.dom );

			document.addEventListener( 'mousemove', boundMouseMove );
			document.addEventListener( 'mouseup', onMouseUp.bind( self ), { once: true } );
		}

		function onMouseMove( e ) {
			if( !self.mouseStart ) return;
			console.log( 'moveee' );
			let mouseEnd = UI.getRelativePosition( e.clientX, e.clientY, self.panel.dom );
			let mouseStart = self.mouseStart;
			if( Math.abs( mouseStart.x - mouseEnd.x ) < 1 || Math.abs( mouseStart.y - mouseEnd.y ) < 1 ) return;

			if( !self.dragDiv ) {
				let dragDiv = document.createElement( 'div' );
				dragDiv.style.border = '1px solid #00BFFF';
				dragDiv.classList.add( 'overlay' );
				dragDiv.style.backgroundColor = 'rgba( 0, 190, 255, 0.2 )';
				self.panel.dom.appendChild( dragDiv );
				self.dragDiv = dragDiv;
			}

			self.dragDiv.style.left = Math.min( mouseStart.x, mouseEnd.x ) + 'px';
			self.dragDiv.style.top = Math.min( mouseStart.y, mouseEnd.y ) + 'px';
			self.dragDiv.style.width = Math.abs( mouseEnd.x - mouseStart.x ) + 'px';
			self.dragDiv.style.height = Math.abs( mouseEnd.y - mouseStart.y ) + 'px';
		}

		function onMouseUp( e ) {
			if( !self.mouseStart ) return;
			let mouseEnd = UI.getRelativePosition( e.clientX, e.clientY, self.panel.dom );
			let mouseStart = self.mouseStart;
			self.mouseStart = null;
			self.panel.dom.removeChild( self.dragDiv );
			self.dragDiv = null;
			if( Math.abs( mouseStart.x - mouseEnd.x ) < 1 || Math.abs( mouseStart.y - mouseEnd.y ) < 1 ) return;

			let valueStart = mouseStart.x / self.panel.width;
			let alphaStart = 1.0 - ( mouseStart.y / self.panel.height );
			let valueEnd = mouseEnd.x / self.panel.width;
			let alphaEnd = 1.0 - ( mouseEnd.y / self.panel.height );

			//mouseup after click+drag
			let left = Math.min( valueStart, valueEnd );
			let right = Math.max( valueStart, valueEnd );
			let bottom = Math.min( alphaStart, alphaEnd );
			let top = Math.max( alphaStart, alphaEnd );

			self.addWidget( { location: { left: left, right: right, bottom: bottom, top: top } } );
			document.removeEventListener( 'mousemove', boundMouseMove );
		}*/
	}

	/**
	 *
	 */
	addContextMenu( options = {} ) {
		let self = this;
		let container = options.container || document.body;
		let panelContextMenu = new ContextMenu( { container: container } );

		let folderName = 'Add widget';
		panelContextMenu.addFolder( folderName );

		function createGradientPresetObject( name, colors ) {
			return {
				name: name,
				folder: folderName,
				colors: colors,
				callback: function( e ) {
					// add new tf widget at top-left position of context menu
					let positionTop = panelContextMenu.panel.top;
					let positionLeft = panelContextMenu.panel.left;
					let value = positionLeft / self.panel.width;
					let alpha = 1.0 - ( positionTop / self.panel.height );
					self.addWidget( { location: { x: value, y: alpha }, colors: colors } );
				}
			};
		}

		let menuObjects = [];
		for( let preset of options.presets ) {
			menuObjects.push( createGradientPresetObject( preset.name, preset.colors ) );
		}

		panelContextMenu.addItems( menuObjects );
		function showContextMenu( e ) {
			let mouse = UI.getRelativePosition( e.clientX, e.clientY, container );

			self.panelContextMenu.showAt( mouse.x, mouse.y );

			document.addEventListener( 'mousedown', self.panelContextMenu.hidePanel, { once: true } );

			//disable default context menu
			e.preventDefault();
		}

		this.panel.dom.addEventListener( 'contextmenu', showContextMenu );
		return panelContextMenu;
	}

	addWidget( options ) {
		let widget = new TF_widget( this.panel, this.panel.dom, options );
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

	setHistogram( histogram ) {
		let self = this;
		this.histogram = histogram;

		//small indicator for histogram tracing
		if( !this.histogramHover ) {
			this.histogramHover = SVG.createCircle( this.panel.svgContext, 0, 0, 'none', 4, '#666' );
			this.histogramHover.setAttribute( 'visibility', 'hidden' );
			this.histogramHover.classList.add( 'tooltip' );
		}

		//tooltip for displaying value of histogram trace
		if( !this.histogramTooltip ) {
			this.histogramTooltip = document.createElement( 'div' );
			this.histogramTooltip.className = 'tooltip';
			this.panel.dom.insertBefore( this.histogramTooltip, this.panel.svgContext );
			//this.panel.dom.appendChild( this.histogramTooltip );
		}

		//show tooltips on hover over tf panel
		this.panel.svgContext.addEventListener( 'mousemove', function ( e ) {
			let mouse = UI.getRelativePosition( e.clientX, e.clientY, self.panel.dom );

			let binWidth = this.canvas.width / histogram.numBins;
			let bin = Math.floor( mouse.x / binWidth );

			let xHover = mouse.x;
			let yHover = this.canvas.height - this.canvas.height * histogram.scale( this.histogram.bins[ bin ] ) / histogram.scale( this.histogram.maxBinValue );
			if ( yHover === Infinity ) yHover = this.canvas.height;

			if ( !isNaN( xHover ) ) this.histogramHover.setAttribute( 'cx', xHover );
			if ( !isNaN( yHover ) ) this.histogramHover.setAttribute( 'cy', yHover );

			this.histogramTooltip.innerHTML = 'value: ' + Math.floor( ( mouse.x / this.canvas.width ) * 255 ) + '<br>' + 'count: ' + this.histogram.bins[ bin ];
			this.histogramTooltip.style.left = xHover + 'px';
			this.histogramTooltip.style.top = yHover + 'px';
		}.bind( self ), true );

		this.drawHistogram( this.options.histogram );
	}

	//redraw
	draw() {
		for( let widget of this.widgets ) {
			widget.drawWidget();
		}
	}

	/*
	 * draw the histogram to the histogram canvas
	 */
	drawHistogram( options = {} ) {
		let canvas = this.canvas;
		let context = canvas.getContext( '2d' );
		context.clearRect( 0, 0, canvas.width, canvas.height );
		context.fillStyle = options.backgroundColor;
		context.fillRect( 0, 0, canvas.width, canvas.height );
		context.fillStyle = options.fillColor;
		context.strokeStyle = options.lineColor;

		let xScale = canvas.width / this.histogram.numBins;

		/* plots the histogram bins as a polygon that traces the centers of each bin */
		let drawPolygonHistogram = function ( scale ) {
			context.beginPath();
			let maxVal = scale( this.histogram.maxBinValue );

			context.moveTo( 0, canvas.height );
			context.lineTo( 0, canvas.height - canvas.height * scale( this.histogram.bins[ 0 ] ) / maxVal );

			let x = xScale / 2;
			for( let bin = 0; bin < this.histogram.numBins; bin++ ) {
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
		let drawBarHistogram = function( scale ) {
			let maxVal = scale( this.histogram.maxBinValue );
			context.beginPath();

			for( let bin = 0; bin < this.histogram.numBins; bin++ ) {
				context.moveTo( xScale * bin, canvas.height );
				context.lineTo( xScale * bin, canvas.height - ( canvas.height * scale( this.histogram.bins[ bin ] ) ) / maxVal );
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
		let outputPoints = [];
		outputPoints.sortPoints = function() {
			this.sort( ( a, b ) => ( a.value > b.value ) );
		};

		function interpolate( pointA, pointB, t ) {
			let colorA = Color.parseColor( pointA.color );
			let colorB = Color.parseColor( pointB.color );
			let colorT = Color.RGBtoHEX( Math.interpolate( colorA.r, colorB.r, t ), Math.interpolate( colorA.g, colorB.g, t ), Math.interpolate( colorA.b, colorB.b, t ) );
			return {	value: Math.interpolate( pointA.value, pointB.value, t ),
						alpha: Math.interpolate( pointA.alpha, pointB.alpha, t ),
						color: colorT };
		}

		function blendColorValue( a, b, t ) {
			return Math.sqrt( ( 1 - t ) * a * a + t * b * b );
		}

		function blendColor( colorA, colorB, t ) {
			Color.RGBtoHEX( blendColorValue( colorA.r, colorB.r, t ), blendColorValue( colorA.g, colorB.g, t ), blendColorValue( colorA.b, colorB.b, t ) );
		}

		outputPoints.findPoints = function( value ) {
			let right = {}, left = {};
			for( let controlPoint of this.controlPoints ) {
				right = controlPoint;
				if( controlPoint.value > value ) {
					break;
				}
				left = right;
			}

			if( left && left.alpha === 0 ) left = {};
			if( right && right.alpha === 0 ) right = {};
			return { left: left, right: right };
		};

		for( let widget of this.widgets ) {
			let controlPoints = widget.controlPoints;
			let start = controlPoints[ 0 ].value;
			let end = controlPoints[ controlPoints.length - 1 ].value;
			let eps = 1e-6;
			//add first and last 'edge' as separate control points
			controlPoints.push( { value: start - eps, alpha: 0, color: '#000' } );
			controlPoints.push( { value: end + eps, alpha: 0, color: '#000' } );
			controlPoints.sort();

			for( let controlPoint of controlPoints ) {
				outputPoints.push( controlPoint );
			}
		}
	}

	TFtoIMG() {
			var img = document.createElement( 'img' );
			let tfCanvas = document.createElement( 'canvas' );
			tfCanvas.height = 30;
			tfCanvas.width = 256;

			let context = tfCanvas.getContext( '2d' );

			for( let widget of this.widgets ) {
				//find minima and maxima (without sorting points)
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

/**
 *  TF_widget contains one range of two or more control points
 */
class TF_widget {
	constructor( parent, container, options = {} ) {
		let self = this;
		this.parent = parent;
		this.container = container;
		this.callbacks = [];

		options.location = options.location || null;
		options.controlPoints = options.controlPoints || [];
		options.opacity = options.opacity || 0.8;
		this.options = options;

		//create canvas for gradient background
		let canvas = document.createElement( 'canvas' );
		this.canvas = canvas;

		canvas.width = parent.width;
		canvas.height = parent.height;
		canvas.className = 'tf-widget-canvas overlay';
		canvas.style.opacity = options.opacity;
		//insert canvases below UI svg context
		container.insertBefore( canvas, parent.svgContext );

		//create context menus for rightclick interaction
		let widgetContextMenu = new ContextMenu( { container: container } );
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
		this.createVerticalHandles();

		let default_colors = [ '#440154', '#414487', '#2a788e', '#22a884', '#7cd250', '#fde725' ]; //viridis

		if( options.location ) {
			options.colors = options.colors || default_colors;
			this.addControlPoints( options.colors, options.location );// 0.3, 0.3, options.location.x, options.location.y );
		}

		if( options.controlPoints.length > 0 ) {
			for( let controlPoint of options.controlPoints ) {
				this.addControlPoint( controlPoint );
			}
		} else if( this.controlPoints.length === 0 ) {
			this.addControlPoints( default_colors, { x: 0.5, y: 0.25 } );// 0.3, 0.5, options.location.x, 0.25 ); //add one default widget
		}

		this.updateHandles();

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
		this.parent.svgContext.removeChild( this.handles.left );
		this.parent.svgContext.removeChild( this.handles.right );
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
		let container = this.container;
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
			let mouse = UI.getRelativePosition( e.clientX, e.clientY, parent.dom );

			//restrict area of movement for control points
			//todo this is not handled very well yet
			if( mouse.x < 0 || mouse.x > this.canvas.width || mouse.y < 0 || mouse.y > this.canvas.height ) return;

			parent.dom.classList.add( 'drag' );
			let offsetX = anchor.data.x - mouse.x;
			let offsetY = anchor.data.y - mouse.y;
			if ( e.shiftKey && anchor.moveLock == 'N' ) {
				anchor.moveLock = ( Math.abs( offsetX ) > Math.abs( offsetY ) ) ? 'H' : 'V';
			}

			if( anchor.moveLock === 'H' ) offsetY = 0;
			if( anchor.moveLock === 'V' ) offsetX = 0;

			let setX = ( anchor.moveLock !== 'V' ) ? mouse.x : null;
			let setY = ( anchor.moveLock !== 'H' ) ? mouse.y : null;

			anchor.set( setX, setY );

			for( let controlPoint of this.controlPoints ) {
				this.updateControlPoint( controlPoint, { x: controlPoint.handle.data.x - offsetX, y: controlPoint.handle.data.y - offsetY } );
			}

			this.updateHandles();

			drawWidgetBound();
			return false;
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
			let mouse = UI.getRelativePosition( e.clientX, e.clientY, container );

			self.widgetContextMenu.showAt( mouse.x, mouse.y );

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
		let self = this;

		let parent = this.parent;
		let outline = SVG.createPolyline( this.parent.svgContext, null, this.canvas.width, this.canvas.height, 'value', 'alpha' );
		outline.classList.add( 'handle' );
		this.outline = outline;

		/**
		 * Mouse events for outline of widget
		 */
		function onOutlineMouseDown( e ) {
			console.log( 'mousedown' );
			if ( !e.shiftKey ) {
				return;
			}
			let mouse = UI.getRelativePosition( e.clientX, e.clientY, parent.dom );

			let value = mouse.x / parent.width;
			let alpha = 1.0 - ( mouse.y / parent.height );

			console.log( 'outline clicked at ' + value + ', ' + alpha );

			let neighbors = self.findNeighborControlPoints( value );

			let leftColor = Color.parseColor( neighbors.left.color ),
				rightColor = Color.parseColor( neighbors.right.color );

			let pct = ( value - neighbors.left.value ) / ( neighbors.right.value - neighbors.left.value );
			let rgb = Math.interpolate( [ leftColor.r, leftColor.g, leftColor.b ], [ rightColor.r, rightColor.g, rightColor.b ], pct );

			let color = Color.RGBtoHEX( rgb[ 0 ], rgb[ 1 ], rgb[ 2 ] );

			self.addControlPoint( value, alpha, color );
		}

		outline.addEventListener( 'mousedown', onOutlineMouseDown );

		//change cursor on hover+shift-hold to indicate addPoint function
		outline.addEventListener( 'mousemove', function( e ) {
			if ( e.shiftKey ) this.classList.add( 'addCursor' );
		} );

		//remove cursor on mouseout
		outline.addEventListener( 'mouseleave', function() {
			this.classList.remove( 'addCursor' );
		} );
	}

	createVerticalHandles() {
		let self = this;
		let parent = this.parent;

		let handleRight = SVG.createVLine( this.parent.svgContext, null, this.canvas.width, this.canvas.height );
		handleRight.classList.add( 'handle' );
		handleRight.handleType = 'right';
		let handleLeft = SVG.createVLine( this.parent.svgContext, null, this.canvas.width, this.canvas.height );
		handleLeft.classList.add( 'handle' );
		handleLeft.handleType = 'left';
		this.handles = {};
		this.handles.right = handleRight;
		this.handles.left = handleLeft;

		/**
		 * Mouse events for vertical widget edges
		 */
		let boundMouseMoveLeft = onHandlesMouseMove.bind( handleLeft );
		let boundMouseMoveRight = onHandlesMouseMove.bind( handleRight );
		let updateWidgetBound = this.updateWidget.bind( self );
		function onHandlesMouseDownLeft( e ) {
			document.addEventListener( 'mousemove', boundMouseMoveLeft );
			document.addEventListener( 'mouseup', function() {
				document.removeEventListener( 'mousemove', boundMouseMoveLeft );
				updateWidgetBound();
			}, { once: true }  );
		}

		function onHandlesMouseDownRight( e ) {
			document.addEventListener( 'mousemove', boundMouseMoveRight );
			document.addEventListener( 'mouseup', function() {
				document.removeEventListener( 'mousemove', boundMouseMoveRight );
				updateWidgetBound();
			}, { once: true }  );
		}

		/**
		 * update control points by scaling range of points when dragging vertical edge of widget
		 */
		function onHandlesMouseMove( e ) {
			let mouse = UI.getRelativePosition( e.clientX, e.clientY, parent.dom );

			let value = mouse.x / parent.width;
			let alpha = 1.0 - ( mouse.y / parent.height );

			let leftControlPoint = self.controlPoints[ 0 ];
			let rightControlPoint = self.controlPoints[ self.controlPoints.length - 1 ];

			let start = ( this.handleType === 'left' ) ? rightControlPoint : leftControlPoint;
			let end   = ( this.handleType === 'left' ) ? leftControlPoint : rightControlPoint;
			let oldRange = end.value - start.value;
			let newRange = value - start.value;

			if( Math.abs( newRange ) < 1e-4 ) return; //avoid setting all points to zero while dragging over widget edge (leads to loss of distance between points)

			if( ( this.handleType === 'left' ) && value >= start || ( this.handleType === 'right' ) && value <= start ) return;

			for( let controlPoint of self.controlPoints ) {
				let position = ( oldRange != 0 ) ? ( controlPoint.value - start.value ) / oldRange : 0; //avoid divide by zero (should not happen)
				self.updateControlPoint( controlPoint, { value: start.value + ( position * newRange ) } );
			}

			updateWidgetBound( false ); //update widget without re-sorting the controlpoints
		}

		handleLeft.addEventListener( 'mousedown', onHandlesMouseDownLeft );
		handleRight.addEventListener( 'mousedown', onHandlesMouseDownRight );
	}

	addControlPoints( colors, location ) {
		let rangeValues, rangeAlpha, anchorValue, anchorAlpha;

		rangeValues = ( location.left && location.right ) ? location.right - location.left : 0.3;
		rangeAlpha = ( location.top && location.bottom ) ? location.top - location.bottom : 0.3;

		let stepValues = rangeValues / ( colors.length - 1 );
		let stepAlpha = rangeAlpha / ( colors.length - 1 );

		let startValues =  location.left ? location.left : ( location.x ? location.x : 0.5 ) - ( rangeValues / 2 );
		let startAlpha = location.bottom ? location.bottom : ( location.y ? 2 * location.y : 0.25 ) - ( rangeAlpha / 2 );

		startValues = Math.clamp( startValues, 0, 1 );
		startAlpha = Math.clamp( startAlpha, 0, 1 );
		colors.map( ( color, index ) => { this.addControlPoint( startValues + index * stepValues, startAlpha + index * stepAlpha, color ); } );
	}

	addControlPoint( value, alpha, color = '#000' ) {
		let parent = this.parent;
		let container = this.container;

		if( typeof value === 'object' ) {
			color = value.color;
			alpha = value.alpha;
			value = value.value;
		}

		let controlPoint = { value: value, alpha: alpha, color: color };

		let handle = SVG.createCircle( parent.svgContext, value * this.canvas.width, this.canvas.height - alpha * this.canvas.height, controlPoint.color );
		handle.classList.add( 'handle' );

		let width = parent.width,
			height = parent.height;

		let self = this;
		let updateWidgetBound = this.updateWidget.bind( self );
		let drawWidgetBound = this.drawWidget.bind( self );
		let moveHandleBound = moveHandle.bind( self );

		/* moves control point handles on mousemove while mouse down */
		function moveHandle( e ) {
			let mouse = UI.getRelativePosition( e.clientX, e.clientY, this.container );

			//restrict area of movement for control points
			//todo this is not handled very well yet
			if( mouse.x < 0 || mouse.x > width || mouse.y < 0 || mouse.y > height ) return;

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
			document.addEventListener( 'mouseup', onMouseUp, { once: true } );
		}

		//add mouse move event when mouse is pressed
		handle.addEventListener( 'mousedown', onMouseDown );

		handle.addEventListener( 'dblclick', function( e ) {
			e.preventDefault();
			console.log( 'request colorpicker' );

			let mouse = UI.getRelativePosition( e.clientX, e.clientY, container );

			parent.cp_widget.showAt( mouse.x, mouse.y, handle );
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

		//modify cursor on hover and shift-hold to indicate deletePoint function
		handle.addEventListener( 'mousemove', function( e ) {
			if ( e.shiftKey ) this.classList.add( 'deleteCursor' );
		} );

		//remove cursor on mouseout
		handle.addEventListener( 'mouseleave', function() {
			this.classList.remove( 'deleteCursor' );
		} );

		controlPoint.handle = handle;
		this.controlPoints.addPoint( controlPoint );
	}

	updateControlPoint( controlPoint, params = {} ) {
		if( typeof controlPoint !== 'object' ) {
			controlPoint = this.findControlPoint( controlPoint );
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
			if( !params.y ) params.y = ( 1.0 - controlPoint.alpha ) * this.parent.width;
		}

		controlPoint.handle.set( params.x, params.y );
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
	 * find the two controlPoints that the specified value lies inbetween
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

	updateWidget( sort = true ) {
		//sort controlPoints by ascending value
		let controlPoints = this.controlPoints;
		if ( sort ) controlPoints.sortPoints();

		this.updateHandles();
		//redraw
		this.drawWidget();
		
		this.updateAnchor();
	}

	updateHandles() {
		this.outline.setPoints( this.controlPoints );

		let leftPoint = this.controlPoints[ 0 ];
		let rightPoint = this.controlPoints[ this.controlPoints.length - 1 ];
		this.handles.left.setPoint( { x: leftPoint.value, y: leftPoint.alpha } );
		this.handles.right.setPoint( { x: rightPoint.value, y: rightPoint.alpha } );
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
		let gradientStart = Math.min( start, end );
		let gradientEnd = Math.max( start, end );
		/*if( start > end ) {
			let tmp = end;
			end = start;
			start = tmp;
		}*/
		let context = canvas.getContext( '2d' );

		context.clearRect( 0, 0, canvas.width, canvas.height );
		context.beginPath();
		context.moveTo( start * canvas.width, canvas.height );

		let widgetWidth = Math.abs( end - start );
		var gradient = context.createLinearGradient( gradientStart * canvas.width, 0, gradientEnd * canvas.width, 0 ); //horizontal gradient

		for( let controlPoint of controlPoints ) {
			//draw line
			context.lineTo( controlPoint.value * canvas.width, canvas.height - controlPoint.alpha * canvas.height );
			//add gradient stop
			let stopPos = Math.clamp( controlPoint.value - gradientStart, 0, 1 ) / widgetWidth;
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

class ContextMenu {
	constructor( options = {} ) {
		let container = options.container || document.body;
		let panel = new Panel( { container: container } );
		panel.dom.classList.add( 'menu', 'popup' );

		let itemsContainer = document.createElement( 'ul' );
		panel.dom.appendChild( itemsContainer );
		panel.moveTo( 0, 0 );

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
		item.onmousedown = function( e ) {
			e.preventDefault();
			callback( e );
		};

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
		this.panel.moveTo( x, y );

		this.panel.show();
		this.caller = null;
	}

	hide() {
		this.panel.hide();
		this.caller = null;
	}
}