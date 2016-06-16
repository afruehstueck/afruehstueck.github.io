'use strict';

var seedOrigin = [ 0.3, 0.45 ], // holds a value to be passed as a uniform to the shader
    seedRadius = 0.1,
    numberOfIterations = 30,
    iteration = 0,
    alpha = 1.0,
    epsilon = 1.0,
    sourceTextureSize = [ 0, 0 ],
    autoIterate = true;

//
// set up webGL
//
var renderCanvas = document.querySelector( '#renderCanvas' );
var overlayCanvas = document.querySelector( '.overlayCanvas' );
var gl = renderCanvas.getContext( 'webgl' );

if ( !gl ) { alert( "Your browser does not support WebGL. " +
    "Please use a WebGL-enabled explorer such as Chrome." ); }

gl.clearColor( 0.0, 0.0, 0.0, 1.0 ); // black, fully opaque
gl.enable( gl.DEPTH_TEST );
gl.depthFunc( gl.LEQUAL ); // Near things obscure far things

// buffers for the textured plane in normalized space
var renderImageCoordinatesBuffer = gl.createBuffer();
var renderImageTextureCoordinatesBuffer = gl.createBuffer();
var renderImageVertices = [ -1., -1., 0., 1., -1., 0., -1., 1., 0., 1., 1., 0. ];
gl.bindBuffer( gl.ARRAY_BUFFER, renderImageCoordinatesBuffer );
gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( renderImageVertices ), gl.STATIC_DRAW );

var renderImageTextureCoordinates = [ 0, 0, 1, 0, 0, 1, 1, 1 ];
gl.bindBuffer( gl.ARRAY_BUFFER, renderImageTextureCoordinatesBuffer );
gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( renderImageTextureCoordinates ), gl.STATIC_DRAW );

// the source texture
var sourceTextureImage; // = new Image();
var sourceTexture = gl.createTexture();
var setupSourceTexture = function () {
    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, sourceTexture );
    gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, true );
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceTextureImage );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
    //gl.bindTexture(gl.TEXTURE_2D, null); // is this call needed? jvm

    sourceTextureSize[ 0 ] = sourceTextureImage.width;
    sourceTextureSize[ 1 ] = sourceTextureImage.height;
};

// textures and framebuffers for iteratively calculating distance field
var textures = [];
var framebuffers = [];

var setupFrameBuffers = function () {
    gl.getExtension("OES_texture_float");
    gl.getExtension("OES_texture_float_linear");

    for ( var idx = 0; idx < 2; ++idx ) {
        // create a texture for the frame buffer
        var texture = gl.createTexture();
        gl.bindTexture( gl.TEXTURE_2D, texture );
        //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // do this now at end? or not needed for intermediates? jvm
        gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, sourceTextureImage.width, sourceTextureImage.height, 0,
            gl.RGBA, gl.FLOAT/*UNSIGNED_BYTE*/, null );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR ); // jvm - do we want nearest or linear?
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
        textures.push( texture );

        // create a framebuffer
        var fbo = gl.createFramebuffer();
        framebuffers.push( fbo );
        gl.bindFramebuffer( gl.FRAMEBUFFER, fbo );
        gl.clearColor( 0.0, 0.0, 0.0, 1.0 );

        // attach texture to frame buffer
        gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0 );
        gl.clear( gl.COLOR_BUFFER_BIT );
    }
};

// the program and shaders
var glProgram = gl.createProgram();
var deferred = $.Deferred();

/* Loading fragment and vertex shaders using require.js */
var setupShaders = function ( fragmentShaderLocation, vertexShaderLocation ) {
    require.config({
        baseUrl: "./"
    });
    require( [ fragmentShaderLocation, vertexShaderLocation ],
        /* Callback function initializing shaders when all resources have been loaded */
        function ( fragmentShaderCode, vertexShaderCode ) {
            var vertexShader = gl.createShader( gl.VERTEX_SHADER );
            gl.shaderSource( vertexShader, vertexShaderCode );
            gl.compileShader( vertexShader );
            if ( !gl.getShaderParameter( vertexShader, gl.COMPILE_STATUS ) ) {
                alert( 'Could not compile vertexShader' );
                console.log( gl.getShaderInfoLog( vertexShader ) );
            }

            var fragmentShader = gl.createShader( gl.FRAGMENT_SHADER );
            gl.shaderSource( fragmentShader, fragmentShaderCode );
            gl.compileShader( fragmentShader );
            if ( !gl.getShaderParameter( fragmentShader, gl.COMPILE_STATUS ) ) {
                alert( 'Could not compile fragmentShader' );
                console.log( gl.getShaderInfoLog( fragmentShader ) );
            }

            gl.attachShader( glProgram, vertexShader );
            gl.deleteShader( vertexShader );

            gl.attachShader( glProgram, fragmentShader );
            gl.deleteShader( fragmentShader );

            gl.linkProgram( glProgram );
            deferred.resolve();
        }
    );

    return deferred.promise();
};

/* attrib locations */
var loc_position,
    loc_texCoord;

/* uniform locations */
var loc_seedOrigin,
    loc_seedRadius,
    loc_sourceTextureSize,
    loc_sourceTexelSize,
    loc_sourceTextureSampler,
    loc_distanceFieldSampler,
    loc_numIteration,
    loc_renderDistanceField,
    loc_alpha,
    loc_epsilon,
    loc_iteration;

var nextIteration = function() {
    if (iteration < numberOfIterations) {
        $( '#log' ).html( 'Iteration ' + ( iteration + 1 ) + '/' + numberOfIterations );
        iteration++;
        renderIteration();
    }
}
var getLocations = function () {
    loc_position = gl.getAttribLocation( glProgram, 'position' );
    loc_texCoord = gl.getAttribLocation( glProgram, 'texCoord' );
    loc_seedOrigin = gl.getUniformLocation( glProgram, 'seedOrigin' );
    loc_seedRadius = gl.getUniformLocation( glProgram, 'seedRadius' );
    loc_sourceTextureSize = gl.getUniformLocation( glProgram, 'sourceTextureSize' );
    loc_sourceTexelSize = gl.getUniformLocation( glProgram, 'sourceTexelSize' );
    loc_sourceTextureSampler = gl.getUniformLocation( glProgram, 'sourceTextureSampler' );
    loc_distanceFieldSampler = gl.getUniformLocation( glProgram, 'distanceFieldSampler' );
    loc_numIteration = gl.getUniformLocation( glProgram, 'numberOfIterations' );
    loc_renderDistanceField = gl.getUniformLocation( glProgram, 'renderDistanceField' );
    loc_alpha = gl.getUniformLocation( glProgram, 'alpha' );
    loc_epsilon = gl.getUniformLocation( glProgram, 'epsilon' );
    loc_iteration = gl.getUniformLocation( glProgram, 'iteration' );
}

// render a frame
function render() {
    gl.viewport( 0, 0, renderCanvas.width, renderCanvas.height );
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    gl.useProgram( glProgram );

    // set up the focus point (pointer position)
    gl.uniform2f( loc_seedOrigin, seedOrigin[ 0 ], seedOrigin[ 1 ] );

    // set up the focus point (pointer position)
    gl.uniform1f( loc_seedRadius, seedRadius );

    // set up the sourceTextureSize
    gl.uniform2f( loc_sourceTextureSize, sourceTextureSize[ 0 ], sourceTextureSize[ 1 ] );

    // set up the sourceTexelSize
    gl.uniform2f( loc_sourceTexelSize, 1.0 / sourceTextureSize[ 0 ], 1.0 / sourceTextureSize[ 1 ] );

    // the sourceTexture
    gl.activeTexture( gl.TEXTURE0 );  // bind sourceTexture to texture unit 0
    gl.bindTexture( gl.TEXTURE_2D, sourceTexture );
    gl.uniform1i( loc_sourceTextureSampler, 0 ); // then, assign sourceTextureSampler to this texture unit

    // the strengthAndLabelTexture
    gl.activeTexture( gl.TEXTURE2 );  // bind strengthAndLabelTexture to texture unit 2
    gl.bindTexture( gl.TEXTURE_2D, textures[ 1 ] ); // use the first or second intermediate texture initially?
    gl.uniform1i( loc_distanceFieldSampler, 2 ); // then, assign intermediateTextureSampler to this texture unit

    // the coordinate attribute
    gl.bindBuffer( gl.ARRAY_BUFFER, renderImageCoordinatesBuffer );
    gl.enableVertexAttribArray( loc_position );
    gl.vertexAttribPointer( loc_position, 3, gl.FLOAT, false, 0, 0 );

    // the textureCoordinate attribute
    gl.bindBuffer( gl.ARRAY_BUFFER, renderImageTextureCoordinatesBuffer );
    gl.enableVertexAttribArray( loc_texCoord );
    gl.vertexAttribPointer( loc_texCoord, 2, gl.FLOAT, false, 0, 0 );

    gl.uniform1i( loc_numIteration, numberOfIterations );
    gl.uniform1f( loc_alpha, alpha );
    gl.uniform1f( loc_epsilon, epsilon );
}

function renderIteration() {
    gl.uniform1i( loc_iteration, iteration );

    // render into one of the texture framebuffers
    gl.uniform1i( loc_renderDistanceField, 1 );
    gl.bindFramebuffer( gl.FRAMEBUFFER, framebuffers[ iteration % 2 ] );
    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );

    // switch the intermediate texture
    gl.activeTexture( gl.TEXTURE2 ); // Use TEXTURE2 as the intermediate image for Grow Cut
    gl.bindTexture( gl.TEXTURE_2D, textures[ iteration % 2 ] );

    //render to output buffer
    gl.uniform1i( loc_renderDistanceField, 0 );
    gl.bindFramebuffer( gl.FRAMEBUFFER, null );
    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
}

function setupInterface() {
    // set up the drawCanvas
    sourceTextureImage = $( '#sourceImage' )[ 0 ];

    setupSourceTexture();

    setupFrameBuffers();
    renderCanvas.height = sourceTextureImage.height;
    renderCanvas.width = sourceTextureImage.width;

    overlayCanvas.height = sourceTextureImage.height;
    overlayCanvas.width = sourceTextureImage.width;
    $('#outputContainer').css('width', sourceTextureImage.width);
    $('.overlayWrapper').css({'width': sourceTextureImage.width, 'height': sourceTextureImage.height});

    $.when( setupShaders( 'scripts/text!shaders/test.frag', 'scripts/text!shaders/test.vert' ) ).done( function () {
        getLocations();
        updateParameters();
    } );


    function drawSourceRegionToCanvas() {
        var context = overlayCanvas.getContext('2d');

        context.save();
        context.clearRect(0, 0, sourceTextureImage.width, sourceTextureImage.height);
        context.fillStyle = '#007dff';
        context.beginPath();
        var circle_coord = denormalizeCoordinate( seedOrigin[ 0 ], seedOrigin [ 1 ] );
        var circle_radius = seedRadius * sourceTextureImage.width;
        context.arc( circle_coord[ 0 ], circle_coord[ 1 ], circle_radius, 0, 2 * Math.PI, false);
        context.fill();

        //draw cut out circle to canvas
        context.beginPath();
        var small_radius = 5;
        context.arc(circle_coord[ 0 ], circle_coord[ 1 ], small_radius, 0, 2 * Math.PI, false);
        context.clip();
        context.clearRect(circle_coord[ 0 ] - small_radius - 1, circle_coord[ 1 ] - small_radius - 1, small_radius * 2 + 2, small_radius * 2 + 2);
        context.restore();
    }
    //
    // user interface elements
    //
    function updateParameters() {
        drawSourceRegionToCanvas();
        numberOfIterations = Number( document.getElementById( 'numberOfIterations' ).value );
        alpha = Number( document.getElementById( 'alpha' ).value );
        epsilon = Number( document.getElementById( 'epsilon' ).value );
        iteration = 0;
        render();
        renderIteration();


        if( autoIterate ) {
            (function iterate( i ) {
                setTimeout( function () {
                    nextIteration();
                    if ( --i ) {          // If i > 0, keep going
                        iterate( i );// Call the loop again, and pass it the current value of i
                    }
                }, 0 );
            })( numberOfIterations );
        }
    }

    // listen to continuous and release events
    // http://stackoverflow.com/questions/18544890/onchange-event-on-input-type-range-is-not-triggering-in-firefox-while-dragging
    document.getElementById( 'numberOfIterations' ).onchange = updateParameters;
    document.getElementById( 'numberOfIterations' ).oninput = updateParameters;
    document.getElementById( 'alpha' ).onchange = updateParameters;
    document.getElementById( 'alpha' ).oninput = updateParameters;
    document.getElementById( 'epsilon' ).oninput = updateParameters;
    document.getElementById( 'epsilon' ).onchange = updateParameters;

    //
    // drawing functions
    //

    var drawRadius = false;
    var currentPoint = [ 0., 0. ];

    function normalizeCoordinate( x, y ) {
        return [ x / sourceTextureImage.width, 1. - ( y / sourceTextureImage.height ) ];
    }

    function denormalizeCoordinate( x, y ) {
        return [ x * sourceTextureImage.width, ( 1. - y ) * sourceTextureImage.height ];
    }

    function startDraw( event ) {
        event.preventDefault();
        drawRadius = true;
        seedOrigin = normalizeCoordinate( event.offsetX, event.offsetY );
    }

    function endDraw( event ) {
        if ( !drawRadius ) {
            return;
        }
        event.preventDefault();
        drawRadius = false;
        currentPoint = normalizeCoordinate( event.offsetX, event.offsetY );
        var dist_x = seedOrigin[ 0 ] - currentPoint[ 0 ];
        var dist_y = seedOrigin[ 1 ] - currentPoint[ 1 ];
        seedRadius = Math.sqrt( dist_x * dist_x + dist_y * dist_y );

        updateParameters();
    }

    $( '#renderCanvas' ).mousedown( startDraw );
    $( '#renderCanvas' ).mouseup( endDraw );
    $( '#renderCanvas' ).mouseout( endDraw );

}

// once document is loaded, then load images, set up textures and framebuffers, and render
$( function () {
    $( '#sourceImage' ).load( setupInterface );
} );