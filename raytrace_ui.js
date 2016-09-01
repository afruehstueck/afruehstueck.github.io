//let stats = new Stats();
//stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
//document.body.appendChild( stats.dom );

////////////////////////////////////////////////////////////////////////////////
// UI CONTROLS
////////////////////////////////////////////////////////////////////////////////


var Controls = function() {
    this.x = seedOrigin.x;
    this.y = seedOrigin.y;
    this.z = seedOrigin.z;
    this.radius = seedRadius;
    this.volume = volumePath;
    this.alpha = alpha;
    this.sensitivity = sensitivity;
    this.targetIntensity = targetIntensity;
    this.webgl1 = ( canvases[ 1 ] !== undefined ) ? canvases[ 0 ].active : false;
    this.webgl2 = ( canvases[ 1 ] !== undefined ) ? canvases[ 1 ].active : canvases[ 0 ].active;
    this.iteratePerClick = iteratePerClick;
    this.dimension_x = volumeDimensions.x;
    this.dimension_y = volumeDimensions.y;
    this.dimension_z = volumeDimensions.z;
    this.channel = channel;
};

var gui = new dat.GUI();
var default_values = new Controls();

// different volume selected from dropdown
function onVolumeChanged( value ) {
    volumePath = value;

    initVolume();
}

function initVolume( value ) {
    for( let canvas of canvases ) {
        init( canvas );
    }

    f_volume.remove( volume_downsample_x );
    f_volume.remove( volume_downsample_y );
    f_volume.remove( volume_downsample_z );
	default_values.dimension_x = volumeDimensions.x;
	default_values.dimension_y = volumeDimensions.y;
	default_values.dimension_z = volumeDimensions.z;
	volume_downsample_x = f_volume.add( default_values, 'dimension_x',
									{   [ datasetDimensions.x + ' (original)' ]: datasetDimensions.x,
										[ datasetDimensions.x / 2 ]: datasetDimensions.x / 2,
										[ datasetDimensions.x / 4 ]: datasetDimensions.x / 4,
										[ datasetDimensions.x / 8 ]: datasetDimensions.x / 8 } ).listen();
	volume_downsample_y = f_volume.add( default_values, 'dimension_y',
									{   [ datasetDimensions.y + ' (original)' ]: datasetDimensions.y,
										[ datasetDimensions.y / 2 ]: datasetDimensions.y / 2,
										[ datasetDimensions.y / 4 ]: datasetDimensions.y / 4,
										[datasetDimensions.y / 8 ]: datasetDimensions.y / 8 } ).listen();
	volume_downsample_z = f_volume.add( default_values, 'dimension_z',
									{   [ datasetDimensions.z + ' (original)' ]: datasetDimensions.z,
										[ datasetDimensions.z / 2 ]: datasetDimensions.z / 2,
										[ datasetDimensions.z / 4 ]: datasetDimensions.z / 4,
										[ datasetDimensions.z / 8 ]: datasetDimensions.z / 8 } ).listen();
}

// distance function parameters updated
function onDistanceFunctionChanged( value ) {
    console.log( 'distance function values updated' );
    for( let canvas of canvases ) {
        updateDistanceFieldUniforms.call( canvas, canvas.programs[ 'update_sdf' ] );
    }
}

// seed position and/or radius values updated
function onSeedChanged( value ) {
    console.log( 'seed values changed' );
    for( let canvas of canvases ) {
        renderOnce.call( canvas );
    }
}

var f_volume = gui.addFolder( 'Volume' );

var volume_select = f_volume.add( default_values, 'volume', volumes );

var volume_channel = f_volume.add( default_values, 'channel', { R: 0, G: 1, B: 2, A: 3 } );

var volume_downsample_x = f_volume.add( default_values, 'dimension_x',
                                        {   [ datasetDimensions.x + ' (original)' ]: datasetDimensions.x,
                                            [ datasetDimensions.x / 2 ]: datasetDimensions.x / 2,
                                            [ datasetDimensions.x / 4 ]: datasetDimensions.x / 4,
                                            [ datasetDimensions.x / 8 ]: datasetDimensions.x / 8 } ).listen();
var volume_downsample_y = f_volume.add( default_values, 'dimension_y',
                                        {   [ datasetDimensions.y + ' (original)' ]: datasetDimensions.y,
                                            [ datasetDimensions.y / 2 ]: datasetDimensions.y / 2,
                                            [ datasetDimensions.y / 4 ]: datasetDimensions.y / 4,
                                            [datasetDimensions.y / 8 ]: datasetDimensions.y / 8 } ).listen();
var volume_downsample_z = f_volume.add( default_values, 'dimension_z',
                                        {   [ datasetDimensions.z + ' (original)' ]: datasetDimensions.z,
                                            [ datasetDimensions.z / 2 ]: datasetDimensions.z / 2,
                                            [ datasetDimensions.z / 4 ]: datasetDimensions.z / 4,
                                            [ datasetDimensions.z / 8 ]: datasetDimensions.z / 8 } ).listen();

volume_channel.onChange( function( value ) {
	channel = value;
});

volume_downsample_x.onChange( function( value ) {
    volumeDimensions.x = value;
});

volume_downsample_y.onChange( function( value ) {
    volumeDimensions.y = value;
});

volume_downsample_z.onChange( function( value ) {
    volumeDimensions.z = value;
});

volume_select.onFinishChange( onVolumeChanged );
volume_downsample_x.onFinishChange( initVolume );
volume_downsample_y.onFinishChange( initVolume );
volume_downsample_z.onFinishChange( initVolume );
volume_channel.onFinishChange( initVolume );

var f_update = gui.addFolder( 'Update' );
if( canvases.length > 1 ) {
	var webgl1_toggle = f_update.add( default_values, 'webgl1' );
	webgl1_toggle.onChange( function( value ) {
		canvases[ 0 ].active = value;
	});
}
var webgl2_toggle = f_update.add( default_values, 'webgl2' );
var iterations_control = f_update.add( default_values, 'iteratePerClick', 1., 15.).step( 1. );

webgl2_toggle.onChange( function( value ) {
    canvases[ canvases.length - 1 ].active = value;
});
iterations_control.onChange( function( value ) {
    iteratePerClick = value;
});

var f_sdf = gui.addFolder( 'Distance Function' );
var alpha_control = f_sdf.add( default_values, 'alpha', 0, 1 );
var intensity_control = f_sdf.add( default_values, 'targetIntensity', 0, 255 ).listen();
var sensitivity_control = f_sdf.add( default_values, 'sensitivity', 0, 1 );

alpha_control.onChange( function( value ) {
    alpha = value;
});
intensity_control.onChange( function( value ) {
    targetIntensity = value;
});
sensitivity_control.onChange( function( value ) {
    sensitivity = value;
});

alpha_control.onFinishChange( onDistanceFunctionChanged );
intensity_control.onFinishChange( onDistanceFunctionChanged );
sensitivity_control.onFinishChange( onDistanceFunctionChanged );

var f_seed = gui.addFolder( 'Seed' );
var seed_x_control = f_seed.add( default_values, 'x', 0, 1 );
var seed_y_control = f_seed.add( default_values, 'y', 0, 1 );
var seed_z_control = f_seed.add( default_values, 'z', 0, 1 );
var seed_radius_control = f_seed.add( default_values, 'radius', 0, 1 );

seed_x_control.onChange( function( value ) {
    seedOrigin.x = value;
});
seed_y_control.onChange( function( value ) {
    seedOrigin.y = value;
});
seed_z_control.onChange( function( value ) {
    seedOrigin.z = value;
});
seed_radius_control.onChange( function( value ) {
    seedRadius = value;
});

seed_x_control.onFinishChange( onSeedChanged );
seed_y_control.onFinishChange( onSeedChanged );
seed_z_control.onFinishChange( onSeedChanged );
seed_radius_control.onFinishChange( onSeedChanged );




////////////////////////////////////////////////////////////////////////////////
// MOUSE EVENTS
////////////////////////////////////////////////////////////////////////////////

var leftMouseDown = false;
var rightMouseDown = false;

let deltaTime,
    lastCalledTime = Date.now();
let mousePos,
    prevMousePos;

for( let canvas of canvases ) {
    canvas.onmousedown      = onMouseDownEvent;
    canvas.onmouseup 		= onMouseUpEvent;
    canvas.onmousemove 	    = onMouseMoveEvent;
    canvas.onkeypress       = onKeyPressEvent;
    canvas.onkeyup          = onKeyReleaseEvent;
    canvas.ontouchstart     = onKeyPressEvent;

    //suppress context menu on right-click
    canvas.oncontextmenu  = function( event ) {
        return false;
    };

}

// converts global mouse coordinates to canvas-specific coordinates
function getMousePos( elem, event ) {
    var rect = elem.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function getNormalizedMousePos( elem, event ) {
    var mouseCoords = getMousePos( elem, event );
    return [ mouseCoords.x / elem.width - 0.5, mouseCoords.y / elem.height - 0.5 ];
}

function onMouseDownEvent( event ) {
    if ( event.button == 0 )
        leftMouseDown = true;
    else if ( event.button == 2 )
        rightMouseDown = true;

    prevMousePos = getNormalizedMousePos( event.target, event );
}

function onMouseUpEvent( event ) {
    event.preventDefault();
    leftMouseDown = false;
    rightMouseDown = false;

    // on mouseup, update all (other) canvases
    for( let canvas of canvases ) {
        render.call( canvas );
    }
}

function onMouseMoveEvent( event ) {
    if( ! ( leftMouseDown  || rightMouseDown ) ) return;

    mousePos = getNormalizedMousePos( event.target, event );

    //only rerender if mouseposition has changed from previous
    let dx = mousePos.x - prevMousePos.x,
        dy = mousePos.y - prevMousePos.y;
    if( Math.abs( dx ) < 1e-6 && Math.abs( dy ) < 1e-6 ) return;

    if( leftMouseDown ) {
        camera.rotate( mousePos, prevMousePos );
    } else if( rightMouseDown ) {
        camera.pan( [ dx , dy ] );
    }

    prevMousePos = mousePos;

    deltaTime = ( Date.now() - lastCalledTime ) / 1000;

    if( deltaTime < 0.01 ) return;

    lastCalledTime = Date.now();

    camera.update();

    //render.call( event.target );
}

function onKeyPressEvent( event ) {
    updating = true;
    //nextIteration.call( event.target );
}

function onKeyReleaseEvent( event ) {
    updating = false;

   	nextNIterations();
}

