'use strict';

//var drawTriangle = require( 'a-big-triangle' );
//var createTexture = require( 'gl-texture2d' );
//var createFBO = require( 'gl-fbo' );
//var context = require( 'gl-context' );
//var Shader = require( 'gl-shader' );
//var glslify = require( 'glslify' );
//var ndarray = require( 'ndarray' );
//var fill = require( 'ndarray-fill' );


// get renderCanvas from DOM
var renderCanvas = document.querySelector( '#renderCanvas' );

// OpenGL context
var gl = renderCanvas.getContext( 'webgl' );

var stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );

//WebGL debug context
//var gl = WebGLDebugUtils.makeDebugContext( renderCanvas.getContext( 'webgl' ) );

// establish whether browser supports OpenGL
if ( !gl ) {
    alert( 'Your browser does not support WebGL. ' +
        'Please use a WebGL-enabled explorer such as Chrome.' );
}

// load extensions for float textures
gl.getExtension( 'OES_texture_float' );
gl.getExtension( 'OES_texture_float_linear' );

var start = Date.now();
var width = 128,
    height = width,
    slices = { x: 16, y: 16 };

    //todo make selectable
var seedOrigin = [ 0.5, 0.4, 0.6 ];
var seedRadius = 0.1;
var targetIntensity = 0.4;

var volumePath;
//volumePath = 'res/test/testball128x128x256.png';
//volumePath = 'res/test/testball128x128x128.png';
//volumePath = 'res/test/multiballs128x128x128.png';
//volumePath = 'res/test/smallercubeg128x128x128.png';
//volumePath = 'res/test/smallercubeg128x128x256.png';
//volumePath = 'res/test/smallercube256x256x256.png';


volumePath = 'res/bonsai128x128x256.png';
//volumePath = 'res/bonsai256x256x256.png';
//volumePath = 'res/foot256x256x256.png';
//volumePath = 'res/male128x128x256.png';
//volumePath = 'res/teapot256x256x256.png';

var frameBuffers,
    frontfaceFrameBuffer,
    backfaceFrameBuffer,
    sourceVolume;

var programs = {};

var position2DBuffer,
    texCoord2DBuffer,
    position3DBuffer,
    texCoord3DBuffer;

// render loop using window.requestAnimationFrame (wherever available)
window.update = ( function() {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function( callback ) {
            window.setTimeout( callback, 1000 / 25 );
        };
} )();

// make canvas fullscreen
function resizeCanvas() {
    var canvas_width = window.innerWidth;//debug set canvas width width * slices.x;//
    var canvas_height = window.innerHeight; //debug set canvas height height * slices.y;//

    renderCanvas.width = canvas_width;
    renderCanvas.height = canvas_height;

    renderCanvas.style.width = canvas_width + 'px';
    renderCanvas.style.height = canvas_height + 'px';
    renderCanvas.style.position = renderCanvas.style.position || 'absolute';

    backfaceFrameBuffer = createFBO( gl, [ canvas_width, canvas_height ] );
    frontfaceFrameBuffer = createFBO( gl, [ canvas_width, canvas_height ] );

    if( camera ) {
        camera.setAspectRatio( renderCanvas.width, renderCanvas.height );
    }

    animate();
}

//adjust canvas dimensions and re-render on resize
window.addEventListener( 'resize', resizeCanvas, false );

////////////////////////////////////////////////////////////////////////////////
// MOUSE EVENTS
////////////////////////////////////////////////////////////////////////////////

var leftMouseDown = false;
var rightMouseDown = false;
renderCanvas.onmousedown = onMouseDownEvent;
document.onmouseup 		= onMouseUpEvent;
document.onmousemove 	= onMouseMoveEvent;
document.onkeypress     = onKeyPressEvent;

//suppress context menu on right-click
document.oncontextmenu  = function( event ) {
    return false;
};

var prevMousePos;

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

    prevMousePos = getNormalizedMousePos( renderCanvas, event );
}

function onMouseUpEvent( event ) {
    event.preventDefault();
    leftMouseDown = false;
    rightMouseDown = false;
}

var lastCalledTime;

function onMouseMoveEvent( event ) {
    if( ! ( leftMouseDown  || rightMouseDown ) ) return;

    var mousePos = getNormalizedMousePos( renderCanvas, event );

    //only rerender if mouseposition has changed from previous
    if( Math.abs( mousePos[ 0 ] - prevMousePos[ 0 ] ) < 1e-6
     && Math.abs( mousePos[ 1 ] - prevMousePos[ 1 ] ) < 1e-6 ) return;

    if( leftMouseDown ) {
        camera.rotate( mousePos, prevMousePos );
    } else if( rightMouseDown ) {
        camera.pan( [ mousePos.x - prevMousePos.x , mousePos.y - prevMousePos.y ] );
    }
    prevMousePos = mousePos;
    camera.update();

    /*if( !lastCalledTime ) {
        lastCalledTime = Date.now();
    }
    var delta = ( Date.now() - lastCalledTime ) / 1000;

    if( delta > 0.01 ) {
        render();
        lastCalledTime = Date.now();
    }*/
}

function onKeyPressEvent( event ) {
    if( !lastCalledTime ) {
        lastCalledTime = Date.now();
    }
    var delta = ( Date.now() - lastCalledTime ) / 1000;

    if( delta < 0.01 ) return;

    lastCalledTime = Date.now();

    if( iteration < MAX_ITERATION ) iteration++;
    //render();
}

////////////////////////////////////////////////////////////////////////////////
// CAMERA SETUP
////////////////////////////////////////////////////////////////////////////////

var camera;

function initCamera() {
    camera = createCamera(  [ 0, 0, -4 ], /* eye vector */
                            [ 0, 0, 0 ], /* target */
                            [ 0, 1, 0 ] ); /* up vector */
    camera.setAspectRatio( renderCanvas.width, renderCanvas.height );
    camera.update();
}

/////////////////////////////////

function createTexture( gl, image ) {
    var texture = gl.createTexture();

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, texture );
    //TODO: make flip_y optional
    gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, true );
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image );
    /*gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );*/
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
    gl.bindTexture( gl.TEXTURE_2D, null );

    return texture;
}

/* Loading fragment and vertex shaders using xhr */
var setupShaders = function ( fragmentShaderPath, vertexShaderPath ) {
    var deferred = $.Deferred();
    var shaders = loadShaders( [ fragmentShaderPath, vertexShaderPath ],
        /* Callback function initializing shaders when all resources have been loaded */
        function() {
            var program = gl.createProgram();

            shaders.forEach(function( shaderObject ) {
                var shader = gl.createShader(
                    shaderObject.type == 'fragment' ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER
                );
                gl.shaderSource( shader, shaderObject.source );
                gl.compileShader( shader );
                if ( !gl.getShaderParameter( shader, gl.COMPILE_STATUS ) ) {
                    alert( 'could not compile ' + shaderObject.type + ' shader \'' + shaderObject.path + '\'' );
                    console.log( gl.getShaderInfoLog( shader ) );
                    return false;
                } else {
                    console.log( 'compiled ' + shaderObject.type + ' shader \'' + shaderObject.path + '\'' );
                }

                gl.attachShader( program, shader );
                gl.deleteShader( shader );
            });

            gl.linkProgram( program );

            if ( !gl.getProgramParameter( program, gl.LINK_STATUS ) ) {
                alert( 'could not initialise shaders' );
            }

            program.name = fragmentShaderPath.slice( 0, -5 );
            //Todo init attrib & uniforms?
            deferred.resolve( program );
        } );

    return deferred.promise();
};

/* 
   request shaders using asynchronous (or synchronous, but deprecated) XMLHttpRequest
   based on (c) WebReflection http://webreflection.blogspot.com/2010/09/fragment-and-vertex-shaders-my-way-to.html
   released under MIT License
*/
function loadShaders( shaders, callback ) {
    function onreadystatechange() {
        var xhr = this,
            i = xhr.i;
        if ( xhr.readyState == 4 ) {
            var t = shaders[ i ].slice( -4 ) == 'frag' ? 'fragment' : 'vertex';
            var s = xhr.responseText;
            //console.log( shaders[ i ] + ': \n' + s );
            shaders[ i ] = { source: s, type: t, path: shaders[ i ] };
            !--length && typeof callback == 'function' && callback( shaders );
        }
    }

    var asynchronous = !!callback;
    for ( var i = shaders.length, length = i, xhr; i--; ) {
        xhr = new XMLHttpRequest();
        xhr.i = i;
        xhr.open( 'get', shaders[ i ], asynchronous );
        if ( asynchronous ) {
            xhr.onreadystatechange = onreadystatechange;
        }
        xhr.send( null );
        onreadystatechange.call( xhr );
    }
    return shaders;
};

var getRaytraceUniforms = function ( program ) {
    program.position = gl.getAttribLocation( program, 'position' );
    program.texCoord = gl.getAttribLocation( program, 'texCoord' );
    program.resolution = gl.getUniformLocation( program, 'resolution' );
    program.volumeDimensions = gl.getUniformLocation( program, 'volumeDimensions' );
    program.tiles = gl.getUniformLocation( program, 'tiles' );
    program.seedOrigin = gl.getUniformLocation( program, 'seedOrigin' );
    program.iGlobalTime = gl.getUniformLocation( program, 'iGlobalTime' );
    program.distanceFieldTexture = gl.getUniformLocation( program, 'distanceFieldTexture' );
    program.backfaceTexture = gl.getUniformLocation( program, 'backfaceTexture' );
    program.frontfaceTexture = gl.getUniformLocation( program, 'frontfaceTexture' );
    program.volumeTexture = gl.getUniformLocation( program, 'volumeTexture' );
    program.projectionMatrix = gl.getUniformLocation( program, 'projectionMatrix' );
    program.modelViewMatrix = gl.getUniformLocation( program, 'modelViewMatrix' );
    program.seedRadius = gl.getUniformLocation( program, 'seedRadius' );

    gl.enableVertexAttribArray( program.position );
    gl.enableVertexAttribArray( program.texCoord );
};

var getBackfacesUniforms = function ( program ) {
    program.position = gl.getAttribLocation( program, 'position' );
    program.texCoord = gl.getAttribLocation( program, 'texCoord' );
    program.projectionMatrix = gl.getUniformLocation( program, 'projectionMatrix' );
    program.modelViewMatrix = gl.getUniformLocation( program, 'modelViewMatrix' );

    gl.enableVertexAttribArray( program.position );
    gl.enableVertexAttribArray( program.texCoord );
};

//TODO: parse uniforms from shader? create shader and add uniforms to shader string?
//parsing uniforms from shader code shouldn't be too hard actually
var getFillUniforms = function ( program ) {
    gl.useProgram( program );
    program.position = gl.getAttribLocation( program, 'position' );
    program.texCoord = gl.getAttribLocation( program, 'texCoord' );
    program.tiles = gl.getUniformLocation( program, 'tiles' );
    program.seedOrigin = gl.getUniformLocation( program, 'seedOrigin' );
    program.seedRadius = gl.getUniformLocation( program, 'seedRadius' );

    gl.enableVertexAttribArray( program.position );
    gl.enableVertexAttribArray( program.texCoord );
};

var getUpdateUniforms = function ( program ) {
    gl.useProgram( program );
    program.position = gl.getAttribLocation( program, 'position' );
    program.texCoord = gl.getAttribLocation( program, 'texCoord' );
    program.tiles = gl.getUniformLocation( program, 'tiles' );
    program.sourceTexelSize = gl.getUniformLocation( program, 'sourceTexelSize' );
    program.volumeDimensions = gl.getUniformLocation( program, 'volumeDimensions' );
    program.seedOrigin = gl.getUniformLocation( program, 'seedOrigin' );
    program.targetIntensity = gl.getUniformLocation( program, 'targetIntensity' );
    program.distanceFieldTexture = gl.getUniformLocation( program, 'distanceFieldTexture' );
    program.volumeTexture = gl.getUniformLocation( program, 'volumeTexture' );
}

var getDebugUniforms = function ( program ) {
    program.position = gl.getAttribLocation( program, 'position' );
    program.texCoord = gl.getAttribLocation( program, 'texCoord' );
    program.distanceTexture = gl.getUniformLocation( program, 'texture' );

    gl.enableVertexAttribArray( program.position );
    gl.enableVertexAttribArray( program.texCoord );
};

//TODO: make floating point optional
//also TODO: make polyfill for non-extension-supporting browsers (eventually)
function createFBO( gl, dimensions ) {
    // create a texture for the frame buffer
    //TODO: reuse createTexture function here!
    var fboTexture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, fboTexture );

    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, dimensions[ 0 ], dimensions[ 1 ], 0, gl.RGBA, gl.FLOAT/*UNSIGNED_BYTE*/, null );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );

    console.log( '... created FBO with dimensions ' + dimensions[ 0 ] + 'x' + dimensions[ 1 ] );
    // create a framebuffer
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer( gl.FRAMEBUFFER, fbo );
    gl.clearColor( 0.5, 0.5, 0.5, 1.0 );

    // attach texture to frame buffer
    gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTexture, 0 );
    gl.clear( gl.COLOR_BUFFER_BIT );

    gl.bindFramebuffer( gl.FRAMEBUFFER, null );

    return { buffer: fbo, texture: fboTexture, width: dimensions[ 0 ], height: dimensions[ 1 ] };
}

function create2DBuffers() {
    position2DBuffer = gl.createBuffer();
    var positionVertices =  // GL_TRIANGLE_STRIP
        [ -1., -1., 0.,     // bottom left corner
           1., -1., 0.,     // bottom right corner
          -1.,  1., 0.,     // top left corner
           1.,  1., 0. ];   // top right corner
     var positionVerticesTriangle = //GL_TRIANGLES
        [ -1., -1.,
           1., -1.,
          -1.,  1.,
          -1.,  1.,
           1., -1.,
           1.,  1. ];
    gl.bindBuffer( gl.ARRAY_BUFFER, position2DBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( positionVerticesTriangle ), gl.STATIC_DRAW );

    texCoord2DBuffer = gl.createBuffer();
    var textureCoords =  // GL_TRIANGLE_STRIP
        [ 0., 0.,
          1., 0.,
          0., 1.,
          1., 1. ];
     var textureCoordsTriangle = //GL_TRIANGLES
        [ 0., 0.,
          1., 0.,
          0., 1.,
          0., 1.,
          1., 0.,
          1., 1. ];
    gl.bindBuffer( gl.ARRAY_BUFFER, texCoord2DBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( textureCoordsTriangle ), gl.STATIC_DRAW );
}

function create3DBuffers() {
    position3DBuffer = gl.createBuffer();

    var v0 = [ -1, -1, -1 ], t0 = [ 0, 0, 0 ],
        v1 = [ -1, -1,  1 ], t1 = [ 0, 0, 1 ],
        v2 = [ -1,  1,  1 ], t2 = [ 0, 1, 1 ],
        v3 = [  1,  1, -1 ], t3 = [ 1, 1, 0 ],
        v4 = [ -1,  1, -1 ], t4 = [ 0, 1, 0 ],
        v5 = [  1, -1,  1 ], t5 = [ 1, 0, 1 ],
        v6 = [  1, -1, -1 ], t6 = [ 1, 0, 0 ],
        v7 = [  1,  1,  1 ], t7 = [ 1, 1, 1 ];

    var positionVertices = [];
    positionVertices = positionVertices.concat( v0, v1, v2 ); //left
    positionVertices = positionVertices.concat( v3, v0, v4 ); //back
    positionVertices = positionVertices.concat( v5, v0, v6 ); //bottom
    positionVertices = positionVertices.concat( v3, v6, v0 ); //back
    positionVertices = positionVertices.concat( v0, v2, v4 ); //left
    positionVertices = positionVertices.concat( v5, v1, v0 ); //bottom
    positionVertices = positionVertices.concat( v2, v1, v5 ); //front
    positionVertices = positionVertices.concat( v7, v6, v3 ); //right
    positionVertices = positionVertices.concat( v6, v7, v5 ); //right
    positionVertices = positionVertices.concat( v7, v3, v4 ); //top
    positionVertices = positionVertices.concat( v7, v4, v2 ); //top
    positionVertices = positionVertices.concat( v7, v2, v5 ); //front

    gl.bindBuffer( gl.ARRAY_BUFFER, position3DBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( positionVertices ), gl.STATIC_DRAW );

    texCoord3DBuffer = gl.createBuffer();
    var textureCoords = [];
    textureCoords = textureCoords.concat( t0, t1, t2 ); //left
    textureCoords = textureCoords.concat( t3, t0, t4 ); //back
    textureCoords = textureCoords.concat( t5, t0, t6 ); //bottom
    textureCoords = textureCoords.concat( t3, t6, t0 ); //back
    textureCoords = textureCoords.concat( t0, t2, t4 ); //left
    textureCoords = textureCoords.concat( t5, t1, t0 ); //bottom
    textureCoords = textureCoords.concat( t2, t1, t5 ); //front
    textureCoords = textureCoords.concat( t7, t6, t3 ); //right
    textureCoords = textureCoords.concat( t6, t7, t5 ); //right
    textureCoords = textureCoords.concat( t7, t3, t4 ); //top
    textureCoords = textureCoords.concat( t7, t4, t2 ); //top
    textureCoords = textureCoords.concat( t7, t2, t5 ); //front

    gl.bindBuffer( gl.ARRAY_BUFFER, texCoord3DBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( textureCoords ), gl.STATIC_DRAW );
}

//Render a 3D box
function renderCube( program ) {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    gl.bindBuffer( gl.ARRAY_BUFFER, position3DBuffer );
    gl.vertexAttribPointer( program.position, 3, gl.FLOAT, false, 0, 0 );

    gl.bindBuffer( gl.ARRAY_BUFFER, texCoord3DBuffer );
    gl.vertexAttribPointer( program.texCoord, 3, gl.FLOAT, false, 0, 0 );

    gl.drawArrays( gl.TRIANGLES, 0, 36 );

    gl.bindBuffer( gl.ARRAY_BUFFER, null );
}

//Render a 2D quad
function renderQuad( program ) {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    gl.bindBuffer( gl.ARRAY_BUFFER, position2DBuffer );
    gl.vertexAttribPointer( program.position, 2, gl.FLOAT, false, 0, 0 );

    gl.bindBuffer( gl.ARRAY_BUFFER, texCoord2DBuffer );
    gl.vertexAttribPointer( program.texCoord, 2, gl.FLOAT, false, 0, 0 );

    //gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
    gl.drawArrays( gl.TRIANGLES, 0, 6 );

    gl.bindBuffer( gl.ARRAY_BUFFER, null );
}

init();

function init() {

    resizeCanvas();
    initCamera();

    var volume_async_load = jQuery.Deferred();

    var sourceImage = new Image();
    sourceImage.onload = function () {
        sourceVolume = createTexture( gl, sourceImage );

        var sourceWidth = sourceImage.width; // should equal width * slices.x
        var sourceHeight = sourceImage.height; // should equal height * slices.y

        //create two fbos to alternately draw to them during iterations
        frameBuffers = [ createFBO( gl, [ sourceWidth, sourceHeight ] ),
                         createFBO( gl, [ sourceWidth, sourceHeight ] ) ];

        volume_async_load.resolve();
    };
    sourceImage.src = volumePath;

    create3DBuffers();
    create2DBuffers();

    var fillsdf_async_load = setupShaders( 'shaders/initialize_sdf.frag', 'shaders/quad.vert' );
    var updatesdf_async_load = setupShaders( 'shaders/update_sdf.frag', 'shaders/quad.vert' );
    var debug_async_load = setupShaders( 'shaders/debug_texture.frag', 'shaders/quad.vert' );
    var backfaces_async_load = setupShaders( 'shaders/backfaces.frag', 'shaders/projected_box.vert' );
    var raytrace_async_load = setupShaders( 'shaders/raytrace.frag', 'shaders/projected_box.vert' );

    //todo: make execution of deferred and their resolve objects cleaner
    $.when( fillsdf_async_load,
        debug_async_load,
        backfaces_async_load,
        raytrace_async_load,
        updatesdf_async_load,
        volume_async_load ).done(
        function ( program_fill,
                   program_debug,
                   program_backfaces,
                   program_raytrace,
                   program_update ) {
            getFillUniforms( program_fill );
            program_fill.render = initializeDistanceField;
            programs[ 'fill' ] = program_fill;

            getDebugUniforms( program_debug );
            program_debug.render = renderTextureToViewport;
            programs[ 'debug' ] = program_debug;

            getBackfacesUniforms( program_backfaces );
            program_backfaces.render = renderFaces;
            programs[ 'backfaces' ] = program_backfaces;

            getRaytraceUniforms( program_raytrace );
            program_raytrace.render = renderRaytrace;
            programs[ 'raytrace' ] = program_raytrace;

            getUpdateUniforms( program_update );
            program_update.render = updateDistanceField;
            programs[ 'update' ] = program_update;

            gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
            updateDistanceFieldUniforms( program_update );
            updateRaytraceUniforms( program_raytrace );
            renderOnce();
            animate();

            /*(function iterate( i ) {
                setTimeout( function () {
                    render();
                    if ( --i ) {          // If i > 0, keep going
                        iterate( i );// Call the loop again, and pass it the current value of i
                    }
                }, 50 );
            })( 100 );*/

            /*(function loop() {
                window.update( loop );
                render();
            })();*/
        } );
}

function renderOnce() {
    if( $.isEmptyObject( programs ) ) return;
    //if( programs === undefined || programs.length == 0 ) return;
    var program_fill = programs[ 'fill' ];

    //initialize the SDF - render initial SDF to FBO
    program_fill.render( frameBuffers[ 0 ], seedOrigin, seedRadius );
}

var backfacing = true;
var iteration = 0;
var MAX_ITERATION = 1500;


function animate() {
    requestAnimationFrame( animate );

    render();
    //stats.update();
}

function render() {
    //stats.begin();
    if( $.isEmptyObject( programs ) ) return;
    //if( programs === undefined || programs.length == 0 ) return;

    var program_debug = programs[ 'debug' ];
    var program_backfaces = programs[ 'backfaces' ];
    var program_raytrace = programs[ 'raytrace' ];
    var program_update = programs[ 'update' ];
    
    //render a texture to fullscreen (for debug purposes)
    //program_debug.render( frameBuffers[ 0 ].texture );

    program_update.render( sourceVolume, frameBuffers[ iteration % 2 ], frameBuffers[ ( iteration + 1 ) % 2 ] );

    //render back and front faces
    program_backfaces.render( backfaceFrameBuffer, backfacing );
    program_backfaces.render( frontfaceFrameBuffer, !backfacing );
    program_raytrace.render( sourceVolume, frameBuffers[ ( iteration + 1 ) % 2 ].texture, frontfaceFrameBuffer.texture, backfaceFrameBuffer.texture );
    //program_raytrace.render( frameBuffers[ ( iteration + 1 ) % 2 ].texture, frameBuffers[ 0 ].texture, frontfaceFrameBuffer.texture, backfaceFrameBuffer.texture );

/*
//debug: write rendercanvas to download folder
    var image = renderCanvas.toDataURL("image/png").replace("image/png", "image/octet-stream");  // here is the most important part because if you dont replace you will get a DOM 18 exception.
    window.location.href = image;
*/


    //if( iteration < MAX_ITERATION ) iteration++;

    //program_debug.render( backfaceFrameBuffer.texture );
    //stats.end();
    //window.update( render );
    /*if( iteration++ < MAX_ITERATION ) {
        render();
    }*/
}

function initializeDistanceField ( frameBuffer, seedOrigin, seedRadius ) {
    var program = this;
    gl.viewport( 0, 0, frameBuffer.width, frameBuffer.height );
    gl.useProgram( program );

    gl.uniform2f( program.tiles, slices.x, slices.y );
    gl.uniform3f( program.seedOrigin, seedOrigin[ 0 ], seedOrigin[ 1 ], seedOrigin[ 2 ] );
    gl.uniform1f( program.seedRadius, seedRadius );

    gl.bindFramebuffer( gl.FRAMEBUFFER, frameBuffer.buffer );

    //gl.clearColor( 1.0, 0.5, 0.2, 1.0 ); //orange for debugging!

    renderQuad( program );

    gl.bindFramebuffer( gl.FRAMEBUFFER, null );
}

function updateDistanceField( volumeTexture, sourceFrameBuffer, targetFrameBuffer ) {
    var program = this;
    gl.viewport( 0, 0, sourceFrameBuffer.width, sourceFrameBuffer.height );
    gl.useProgram( program );

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, volumeTexture );
    gl.uniform1i( program.volumeTexture, 0 );

    gl.activeTexture( gl.TEXTURE1 );
    gl.bindTexture( gl.TEXTURE_2D, sourceFrameBuffer.texture ); //fbo texture to read from
    gl.uniform1i( program.distanceFieldTexture, 1 );

    gl.bindFramebuffer( gl.FRAMEBUFFER, targetFrameBuffer.buffer ); //fbo texture to write to

    renderQuad( program );

    gl.bindFramebuffer( gl.FRAMEBUFFER, null );
}

function renderTextureToViewport( texture ) {
    var program = this;

    gl.viewport( 0, 0, renderCanvas.width, renderCanvas.height );

    gl.useProgram( program );

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.uniform1i( program.texture, 0 );

    renderQuad( program );

    gl.bindTexture( gl.TEXTURE_2D, null );
}

function renderFaces( frameBuffer, backfacing ) {
    var program = this;

    gl.enable( gl.CULL_FACE );
    gl.enable( gl.DEPTH_TEST );
    if( backfacing ) {
        gl.cullFace( gl.FRONT );
    } else {
        gl.cullFace( gl.BACK );
    }
    gl.bindFramebuffer( gl.FRAMEBUFFER, frameBuffer.buffer ); //render to framebuffer, not screen

    gl.viewport( 0, 0, renderCanvas.width, renderCanvas.height );

    gl.useProgram( program );

    gl.uniformMatrix4fv( program.projectionMatrix, false, camera.projectionMatrix );
    gl.uniformMatrix4fv( program.modelViewMatrix, false, camera.modelViewMatrix );

    renderCube( program );

    gl.bindFramebuffer( gl.FRAMEBUFFER, null );

    gl.disable( gl.CULL_FACE );
    gl.disable( gl.DEPTH_TEST );
}

function renderRaytrace( volumeTexture, distanceFieldTexture, frontfaceTexture, backfaceTexture ) {
    var program = this;
    gl.viewport( 0, 0, renderCanvas.width, renderCanvas.height );

    gl.useProgram( program );

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, backfaceTexture );
    gl.uniform1i( program.backfaceTexture, 0 );

    gl.activeTexture( gl.TEXTURE1 );
    gl.bindTexture( gl.TEXTURE_2D, frontfaceTexture );
    gl.uniform1i( program.frontfaceTexture, 1 );

    gl.activeTexture( gl.TEXTURE2 );
    gl.bindTexture( gl.TEXTURE_2D, volumeTexture );
    gl.uniform1i( program.volumeTexture, 2 );

    gl.activeTexture( gl.TEXTURE3 );
    gl.bindTexture( gl.TEXTURE_2D, distanceFieldTexture );
    gl.uniform1i( program.distanceFieldTexture, 3 );


    gl.uniformMatrix4fv( program.projectionMatrix, false, camera.projectionMatrix );
    gl.uniformMatrix4fv( program.modelViewMatrix, false, camera.modelViewMatrix );
    gl.uniformMatrix4fv( program.modelMatrix, false, camera.modelMatrix );

    renderCube( program );
}

function updateDistanceFieldUniforms( program ) {
    gl.useProgram( program );
    gl.uniform2f( program.tiles, slices.x, slices.y );
    gl.uniform2f( program.sourceTexelSize, 1. / width, 1. / height );
    gl.uniform3f( program.seedOrigin, seedOrigin[ 0 ], seedOrigin[ 1 ], seedOrigin[ 2 ] );
    gl.uniform1f( program.targetIntensity, targetIntensity );
    gl.uniform3f( program.volumeDimensions, width, height, slices.x * slices.y );

}

function updateRaytraceUniforms( program ) {
    gl.useProgram( program );
    //gl.uniform1f( program.iGlobalTime, ( Date.now() - start ) / 1000.0 );
    gl.uniform1f( program.seedRadius, seedRadius );
    gl.uniform2f( program.resolution, renderCanvas.width, renderCanvas.height );
    gl.uniform2f( program.tiles, slices.x, slices.y );
    gl.uniform3f( program.volumeDimensions, width, height, slices.x * slices.y );
    gl.uniform3f( program.seedOrigin, seedOrigin[ 0 ], seedOrigin[ 1 ], seedOrigin[ 2 ] );
}