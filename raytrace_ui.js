let stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );

var Controls = function() {
    this.x = seedOrigin.x;
    this.y = seedOrigin.y;
    this.z = seedOrigin.z;
    this.radius = seedRadius;
    this.volume = volumePath;
    this.alpha = alpha;
    this.sensitivity = sensitivity;
    this.targetIntensity = targetIntensity;
};

var gui = new dat.GUI();
var default_values = new Controls();


var f_volume = gui.addFolder( 'Volume' );
var volume_select = f_volume.add( default_values, 'volume', { bonsai: 'res/bonsai128x128x256.png', head: 'res/head128x128x256.png', heart: 'res/heart128x128x256.png', torso: 'res/torso128x128x256.png' } );

function onVolumeChanged( value ) {
    volumePath = value;

    for( let index = 0; index < canvases.length; index++ ) {
        init( canvases[ index ] );
    }
};

volume_select.onFinishChange( onVolumeChanged );

var f_sdf = gui.addFolder( 'Distance Function' );
var alpha_control = f_sdf.add( default_values, 'alpha', 0, 1 );
var intensity_control = f_sdf.add( default_values, 'targetIntensity', 0, 255 );
var sensitivity_control = f_sdf.add( default_values, 'sensitivity', 0, 1 );

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
alpha_control.onChange( function( value ) {
    alpha = value;
});
intensity_control.onChange( function( value ) {
    targetIntensity = value;
});
sensitivity_control.onChange( function( value ) {
    sensitivity = value;
});

function onSeedChanged( value ) {
    //iteration = 0;
    //targetIntensity = -1.;
    console.log( 'values changed' );
    for( let index = 0; index < canvases.length; index++ ) {
        renderOnce.call( canvases[ index ] );
    }
};

seed_x_control.onFinishChange( onSeedChanged );
seed_y_control.onFinishChange( onSeedChanged );
seed_z_control.onFinishChange( onSeedChanged );
seed_radius_control.onFinishChange( onSeedChanged );
alpha_control.onFinishChange( onSeedChanged );
intensity_control.onFinishChange( onSeedChanged );
sensitivity_control.onFinishChange( onSeedChanged );



////////////////////////////////////////////////////////////////////////////////
// MOUSE EVENTS
////////////////////////////////////////////////////////////////////////////////

var leftMouseDown = false;
var rightMouseDown = false;

let deltaTime,
    lastCalledTime = Date.now();
let mousePos,
    prevMousePos;

for( var index = 0; index < canvases.length; index++ ) {
    var canvas = canvases[ index ];

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
    for( var index = 0; index < canvases.length; index++ ) {
        var canvas = canvases[ index ];
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

    for( var iter = 0; iter < 10; iter++ ) {
        // on keypress, update all (other) canvases
        for( var index = 0; index < canvases.length; index++ ) {
            var canvas = canvases[ index ];
            update.call( canvas );
        }

        nextIteration();
    }
}

