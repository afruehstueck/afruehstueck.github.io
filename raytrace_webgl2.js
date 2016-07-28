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
var gl = renderCanvas.getContext( 'webgl2', { antialias: false } );
var isWebGL2 = !!gl;
if( !isWebGL2 ) {
    document.body.innerHTML = 'WebGL 2.0 is not available in your browser.  See <a href="https://www.khronos.org/webgl/wiki/Getting_a_WebGL_Implementation">How to run WebGL 2.0</a>';
}

var stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );


// load extensions for float textures
gl.getExtension( 'OES_texture_float' );
gl.getExtension( 'OES_texture_float_linear' );

var start = Date.now();
var slices = { x: 16, y: 16 };
var width = 128,
    height = width,
    depth = slices.x * slices.y;

var seedOrigin = [ 0.58, 0.11, 0.3 ];
//var seedOrigin = [ 0.5, 0.55, 0.45 ];
var seedRadius = 0.1;
var targetIntensity = 0.2;

var updating = false;

var volumePath;
//volumePath = 'res/test/testball128x128x256.png';
//volumePath = 'res/test/testball128x128x128.png';
//volumePath = 'res/test/multiballs128x128x128.png';
//volumePath = 'res/test/smallercubeg128x128x128.png';
//volumePath = 'res/test/smallercubeg128x128x256.png';
//volumePath = 'res/test/smallercube256x256x256.png';


volumePath = 'res/bonsai128x128x256.png';
//volumePath = 'res/heart128x128x256.png';
//volumePath = 'res/bonsai256x256x256.png';
//volumePath = 'res/foot256x256x256.png';
//volumePath = 'res/male128x128x256.png';
//volumePath = 'res/teapot256x256x256.png';

var frameBuffers,
    backfaceFrameBuffer,
    volumeFrameBuffer,
    tiledVolume;

var programs = {};

var position2DBuffer,
    texCoord2DBuffer,
    position3DBuffer,
    texCoord3DBuffer;

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
document.onkeyup        = onKeyReleaseEvent;
document.ontouchstart   = onKeyPressEvent;

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
    updating = true;
    //render();
}

function onKeyReleaseEvent( event ) {
    updating = false;
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

//todo consider non-power of two support
function createTextureFromImage( gl, image ) {
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

function createTextureFromSize( gl, dimensions ) {
    var texture = gl.createTexture();

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, texture );
    /*
     //TODO: make flip_y optional
     gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, true );*/
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, dimensions[ 0 ], dimensions[ 1 ], 0, gl.RGBA, gl.FLOAT/*UNSIGNED_BYTE*/, null );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
    gl.bindTexture( gl.TEXTURE_2D, null );

    return texture;
}

function create3DTexture( gl, dimensions ) {
    var texture = gl.createTexture();

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_3D, texture );
    gl.texImage3D(
        gl.TEXTURE_3D,   // target
        0,               // level
        gl.RGBA,         // internalformat
        dimensions[ 0 ], // width
        dimensions[ 1 ], // height
        dimensions[ 2 ], // depth
        0,               // border
        gl.RGBA,         // format
        gl.FLOAT,        // type //gl.UNSIGNED_BYTE
        null             // pixel
    );

    gl.texParameteri( gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
    gl.bindTexture( gl.TEXTURE_3D, null );

    return texture;
}

/* Loading fragment and vertex shaders using xhr */
var setupShaders = function ( vertexShaderPath, fragmentShaderPath, uniforms ) {
    var deferred = $.Deferred();
    var shaders = loadShaders( [ vertexShaderPath, fragmentShaderPath ],
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

            //name program by fragment shader name minus extension minus folder
            program.name = fragmentShaderPath.slice( 0, -5 ).slice( fragmentShaderPath.indexOf( '/' ) + 1 );

            if ( !gl.getProgramParameter( program, gl.LINK_STATUS ) ) {
                alert( 'could not initialise shaders for ' + program.name + ' program' );
            }

            //Todo init attrib & uniforms?
            deferred.resolve( [ program, uniforms ] );
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

//TODO: make floating point optional
//also TODO: make polyfill for non-extension-supporting browsers (eventually)
function createFBO( gl, dimensions ) {
    // create a texture for the frame buffer

    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer( gl.FRAMEBUFFER, fbo );
    gl.clearColor( 0.5, 0.5, 0.5, 1.0 );

    var fboTexture;
    //create 2D or 3D framebuffer
    if( dimensions.length == 2 ) {
        fboTexture = createTextureFromSize( gl, dimensions );

        gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTexture, 0 );
    } else {
        fboTexture = create3DTexture( gl, dimensions );
        for( var layer = 0; layer < depth; layer++ ) {
            gl.framebufferTextureLayer( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, fboTexture, 0, layer );
        }
    }

    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.bindFramebuffer( gl.FRAMEBUFFER, null );

    if ( gl.checkFramebufferStatus( gl.FRAMEBUFFER ) != gl.FRAMEBUFFER_COMPLETE ) {
        console.log( 'framebuffer incomplete: ' + gl.checkFramebufferStatus( gl.FRAMEBUFFER ).toString( 16 ) );
    }

    console.log( '... created FBO with dimensions ' + dimensions[ 0 ] + 'x' + dimensions[ 1 ] + ( dimensions[ 2 ] ? ( 'x' + dimensions[ 2 ] ) : '' ) );
    return { buffer: fbo, texture: fboTexture, width: width, height: height, depth: dimensions.length > 2 ? depth : undefined };
}

function create2DBuffers() {
    position2DBuffer = gl.createBuffer();
    var positionVertices =  // GL_TRIANGLE_STRIP
        [   -1., -1., 0.,     // bottom left corner
            1., -1., 0.,     // bottom right corner
            -1.,  1., 0.,     // top left corner
            1.,  1., 0. ];   // top right corner
    var positionVerticesTriangle = //GL_TRIANGLES
        [   -1., -1.,
            1., -1.,
            -1.,  1.,
            -1.,  1.,
            1., -1.,
            1.,  1. ];
    gl.bindBuffer( gl.ARRAY_BUFFER, position2DBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( positionVerticesTriangle ), gl.STATIC_DRAW );
    gl.bindBuffer( gl.ARRAY_BUFFER, null );

    texCoord2DBuffer = gl.createBuffer();
    var textureCoords =  // GL_TRIANGLE_STRIP
        [   0., 0.,
            1., 0.,
            0., 1.,
            1., 1. ];
    var textureCoordsTriangle = //GL_TRIANGLES
        [   0., 0.,
            1., 0.,
            0., 1.,
            0., 1.,
            1., 0.,
            1., 1. ];
    gl.bindBuffer( gl.ARRAY_BUFFER, texCoord2DBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( textureCoordsTriangle ), gl.STATIC_DRAW );
    gl.bindBuffer( gl.ARRAY_BUFFER, null );
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

//Render a 3D box using current program
function renderCube( program ) {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    gl.enable( gl.DEPTH_TEST );

    gl.bindBuffer( gl.ARRAY_BUFFER, position3DBuffer );
    gl.vertexAttribPointer( program.position, 3, gl.FLOAT, false, 0, 0 );

    gl.bindBuffer( gl.ARRAY_BUFFER, texCoord3DBuffer );
    gl.vertexAttribPointer( program.texCoord, 3, gl.FLOAT, false, 0, 0 );

    gl.drawArrays( gl.TRIANGLES, 0, 36 );

    gl.disable( gl.DEPTH_TEST );

    gl.bindBuffer( gl.ARRAY_BUFFER, null );
}

//Render a 2D quad using current program
function renderQuad( program ) {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    gl.bindBuffer( gl.ARRAY_BUFFER, position2DBuffer );
    gl.vertexAttribPointer( program.position, 2, gl.FLOAT, false, 0, 0 );

    gl.bindBuffer( gl.ARRAY_BUFFER, texCoord2DBuffer );
    gl.vertexAttribPointer( program.texCoord, 2, gl.FLOAT, false, 0, 0 );

    gl.drawArrays( gl.TRIANGLES, 0, 6 );
    gl.bindBuffer( gl.ARRAY_BUFFER, null );
}

//Render a 2D quad to all layers of 3D texture using current program
function renderTo3DTexture( program, framebuffer, depth ) {
    gl.bindFramebuffer( gl.FRAMEBUFFER, framebuffer.buffer );

    for( var layer = 0; layer < depth; layer++ ) {
        gl.uniform1f( program.layer, layer );
        gl.framebufferTextureLayer( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, framebuffer.texture, 0, layer );

        renderQuad( program );
    }

    gl.bindFramebuffer( gl.FRAMEBUFFER, null );
}

init();

function init() {

    resizeCanvas();
    initCamera();

    var volume_async_load = jQuery.Deferred();

    var sourceImage = new Image();
    sourceImage.onload = function () {
        //load tiled volume from PNG to texture
        tiledVolume = createTextureFromImage( gl, sourceImage );
        //create 3D FBO for 3D volume texture
        volumeFrameBuffer = createFBO( gl, [ width, height, depth ] );

        //create two fbos to alternately draw to them during iterations
        frameBuffers = [ createFBO( gl, [ width, height, depth ] ),
            createFBO( gl, [ width, height, depth ] ) ];

        volume_async_load.resolve();
    };
    sourceImage.src = volumePath;

    create2DBuffers();
    create3DBuffers();


    var quad_vert = 'shaders_webgl2/quad.vert';
    var box_vert  = 'shaders_webgl2/projected_box.vert';

    var attribs = [ 'position', 'texCoord' ];

    //TODO: parse uniforms from shader? create shader and add uniforms to shader string?
    //parsing uniforms from shader code shouldn't be too hard ... actually

    //list of shaders
    //format: [ vertexShaderPath, fragmentShaderPath, Array_of_uniforms, renderFunction
    var shaderPairs = [
        [ quad_vert, 'shaders_webgl2/initialize_volume.frag',
            [   'tiles',
                'layer' ]
        ],
        [ quad_vert, 'shaders_webgl2/initialize_sdf.frag',
            [   'tiles',
                'layer',
                'seedOrigin',
                'seedRadius' ]
        ],
        [ quad_vert, 'shaders_webgl2/update_sdf.frag',
            [   'tiles',
                'layer',
                'volumeDimensions',
                'seedOrigin',
                'targetIntensity',
                'distanceFieldTexture',
                'volumeTexture' ]
        ],
        [ quad_vert, 'shaders_webgl2/debug_texture.frag',
            [   'tex' ]
        ],
        [ box_vert,  'shaders_webgl2/backfaces.frag',
            [   'projectionMatrix',
                'modelViewMatrix' ]
        ],
        [ box_vert,  'shaders_webgl2/raytrace.frag',
            [   'distanceFieldTexture',
                'backfaceTexture',
                'volumeTexture',
                'projectionMatrix',
                'modelViewMatrix' ]
        ]
    ];

    var deferreds = $.map( shaderPairs, function( current ) {
        return setupShaders( current[ 0 ], current[ 1 ], current[ 2 ] );
    });

    deferreds.push( volume_async_load );

    var getLocations = function ( program, attribs, uniforms ) {
        $.map( attribs, function( attrib ) {
            program[ attrib ] = gl.getAttribLocation( program, attrib );
        });
        $.map( uniforms, function( uniform ) {
            program[ uniform ] = gl.getUniformLocation( program, uniform );
        });
    };

    //todo: make execution of deferred and their resolve objects cleaner
    //when all deferreds are resolved, then
    $.when.apply( $, deferreds ).done( function() {

        //step through all created shader programs and obtain their uniform and attrib locations
        //store created programs to programs array under the name of their fragment shader
        for( var i = 0; i < arguments.length; i++ ) {
            if ( arguments[ i ] === undefined ) {
                continue;
            }
            var program = arguments[ i ][ 0 ];
            var uniforms = arguments[ i ][ 1 ];
            getLocations( program, attribs, uniforms );
            programs[ program.name ] = program;
        }

        gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
        updateDistanceFieldUniforms( programs[ 'update_sdf' ] );

        gl.enableVertexAttribArray( programs[ 'raytrace' ].position );
        gl.enableVertexAttribArray( programs[ 'raytrace' ].texCoord );
        //updateRaytraceUniforms( programs[ 'raytrace' ] );
        renderOnce();
        animate();
    } );
}

function updateDistanceFieldUniforms( program ) {
    gl.useProgram( program );
    gl.uniform2f( program.tiles, slices.x, slices.y );
    gl.uniform3f( program.seedOrigin, seedOrigin[ 0 ], seedOrigin[ 1 ], seedOrigin[ 2 ] );
    gl.uniform1f( program.targetIntensity, targetIntensity );
    gl.uniform3f( program.volumeDimensions, width, height, slices.x * slices.y );
}

function renderOnce() {
    if( $.isEmptyObject( programs ) ) return;

    console.log( 'initialize...' );
    //transfer the volume from the two tiled texture into the volume 3D texture
    initializeVolume( programs[ 'initialize_volume' ], volumeFrameBuffer, tiledVolume );

    //initialize the SDF - render initial SDF to FBO
    initializeDistanceField( programs[ 'initialize_sdf' ], frameBuffers[ 0 ], seedOrigin, seedRadius );
}

var backfacing = true;
var iteration = 0;
var MAX_ITERATION = 500;


function animate() {
    stats.begin();

    if( updating ) nextIteration();
    render();

    stats.end();
    requestAnimationFrame( animate );
}

var lastCalledTime;

function nextIteration() {
    if( $.isEmptyObject( programs ) ) return;

    if( !lastCalledTime ) {
        lastCalledTime = Date.now();
    }
    var delta = ( Date.now() - lastCalledTime ) / 1000;

    if( delta < 0.01 ) return;

    lastCalledTime = Date.now();

    if( iteration < MAX_ITERATION ) {
        updateDistanceField( programs[ 'update_sdf' ], volumeFrameBuffer, frameBuffers[ iteration % 2 ], frameBuffers[ ( iteration + 1 ) % 2 ] );
        iteration++;
    }
    console.log( 'iteration ' + iteration );
}

function render() {
    if( $.isEmptyObject( programs ) ) return;

    //render backface
    renderBackface( programs[ 'backfaces' ], backfaceFrameBuffer );
    //raytrace volume
    renderRaytrace( programs[ 'raytrace' ], volumeFrameBuffer.texture, frameBuffers[ iteration % 2 ].texture, backfaceFrameBuffer.texture );

    //render a texture to fullscreen (for debug purposes)
    //renderTextureToViewport(programs[ 'debug_texture' ], tiledVolume );

    /*
     //debug: write rendercanvas to download folder
     var image = renderCanvas.toDataURL("image/png").replace("image/png", "image/octet-stream");  // here is the most important part because if you dont replace you will get a DOM 18 exception.
     window.location.href = image;

     */
}

// RENDER FUNCTIONS

//transfer volume from tiled 2D format into 3D texture
function initializeVolume ( program, volumeFrameBuffer, tiledTexture ) {
    gl.viewport( 0, 0, width, height );
    gl.useProgram( program );

    gl.uniform2f( program.tiles, slices.x, slices.y );

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, tiledTexture );
    gl.uniform1i( program.tiledTexture, 0 );

    renderTo3DTexture( program, volumeFrameBuffer, depth );
}

//initialize distance field from seed
function initializeDistanceField( program, frameBuffer, seedOrigin, seedRadius ) {
    gl.viewport( 0, 0, width, height );
    gl.useProgram( program );

    gl.uniform2f( program.tiles, slices.x, slices.y );
    gl.uniform3f( program.seedOrigin, seedOrigin[ 0 ], seedOrigin[ 1 ], seedOrigin[ 2 ] );
    gl.uniform1f( program.seedRadius, seedRadius );

    renderTo3DTexture( program, frameBuffer, depth );
}

//update distance field by looking up values from one texture and updating it into other
function updateDistanceField( program, volumeFrameBuffer, sourceFrameBuffer, targetFrameBuffer ) {
    gl.viewport( 0, 0, width, height );
    gl.useProgram( program );

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_3D, volumeFrameBuffer.texture );
    gl.uniform1i( program.volumeTexture, 0 );

    gl.activeTexture( gl.TEXTURE1 );
    gl.bindTexture( gl.TEXTURE_3D, sourceFrameBuffer.texture ); //fbo texture to read from
    gl.uniform1i( program.distanceFieldTexture, 1 );

    renderTo3DTexture( program, targetFrameBuffer, depth );
}

//render texture into screen / for debugging
function renderTextureToViewport( program, texture ) {
    gl.viewport( 0, 0, renderCanvas.width, renderCanvas.height );

    gl.useProgram( program );

    gl.activeTexture( gl.TEXTURE0 );
    //gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.uniform1i( program.tex, 0 );

    renderQuad( program );

    gl.bindTexture( gl.TEXTURE_2D, null );
}

//render backface of cube
function renderBackface( program, frameBuffer ) {
    gl.enable( gl.CULL_FACE );
    gl.enable( gl.DEPTH_TEST );

    gl.cullFace( gl.FRONT );

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

//do raytracing of cube
function renderRaytrace( program, volumeTexture, distanceFieldTexture, backfaceTexture ) {
    gl.viewport( 0, 0, renderCanvas.width, renderCanvas.height );

    gl.useProgram( program );

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, backfaceTexture );
    gl.uniform1i( program.backfaceTexture, 0 );

    gl.activeTexture( gl.TEXTURE1 );
    gl.bindTexture( gl.TEXTURE_3D, volumeTexture );
    gl.uniform1i( program.volumeTexture, 1 );

    gl.activeTexture( gl.TEXTURE2 );
    gl.bindTexture( gl.TEXTURE_3D, distanceFieldTexture );
    gl.uniform1i( program.distanceFieldTexture, 2 );

    gl.uniformMatrix4fv( program.projectionMatrix, false, camera.projectionMatrix );
    gl.uniformMatrix4fv( program.modelViewMatrix, false, camera.modelViewMatrix );
    gl.uniformMatrix4fv( program.modelMatrix, false, camera.modelMatrix );

    renderCube( program );
}

/*
function updateRaytraceUniforms( program ) {
    gl.useProgram( program );
    //gl.uniform1f( program.iGlobalTime, ( Date.now() - start ) / 1000.0 );
    gl.uniform1f( program.seedRadius, seedRadius );
    gl.uniform2f( program.resolution, renderCanvas.width, renderCanvas.height );
    gl.uniform2f( program.tiles, slices.x, slices.y );
    gl.uniform3f( program.volumeDimensions, width, height, slices.x * slices.y );
    gl.uniform3f( program.seedOrigin, seedOrigin[ 0 ], seedOrigin[ 1 ], seedOrigin[ 2 ] );
}*/
