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
var width = 256,
    height = 256,
    slices_x = 16,
    slices_y = 16;

var frameBuffers,
    backfaceFrameBuffer,
    sourceVolume;
var seedOrigin;
var seedRadius;

var programs = [];

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
        function(/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
            window.setTimeout( callback, 1000 / 25 );
        };
} )();

// make canvas fullscreen
function resizeCanvas() {
    var canvas_width = window.innerWidth;
    var canvas_height = window.innerHeight;

    renderCanvas.width = canvas_width;
    renderCanvas.height = canvas_height;

    renderCanvas.style.width = canvas_width + 'px';
    renderCanvas.style.height = canvas_height + 'px';
    renderCanvas.style.position = renderCanvas.style.position || 'absolute';

    backfaceFrameBuffer = createFBO( gl, [ canvas_width, canvas_height ] );

    render();
}

//adjust canvas dimensions and re-render on resize
window.addEventListener( 'resize', resizeCanvas, false );

///////////////////////////////// MOUSE EVENTS
var mouseDown = false;
renderCanvas.onmousedown = onMouseDownEvent;
document.onmouseup 		= onMouseUpEvent;
document.onmousemove 	= onMouseMoveEvent;


// converts global mouse coordinates to canvas-specific coordinates
function getMousePos( elem, event ) {
    var rect = elem.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function onMouseDownEvent( event ) {
    mouseDown = true;
    var mouseCoords = getMousePos( renderCanvas, event );
    camera.start( mouseCoords.x, mouseCoords.y );
}

function onMouseUpEvent( event ) {
    mouseDown = false;
    camera.bRotate = false;
}

function onMouseMoveEvent( event ) {
    if( !mouseDown ) return;

    camera.bRotate = true;
    var mouseCoords = getMousePos( renderCanvas, event );
    camera.update( mouseCoords.x, mouseCoords.y );
}
///////////////////////////////// CAMERA
var camera;

function initCamera() {
    camera = new Camera();
    camera.width = renderCanvas.width;
    camera.height = renderCanvas.height;
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
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
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
   request shaders using XMLHttpRequest
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
    program.iResolution = gl.getUniformLocation( program, 'iResolution' );
    program.iGlobalTime = gl.getUniformLocation( program, 'iGlobalTime' );
    program.sdfBuffer = gl.getUniformLocation( program, 'sdfBuffer' );
    program.backfaceBuffer = gl.getUniformLocation( program, 'backfaceBuffer' );
    program.volumeTexture = gl.getUniformLocation( program, 'volumeTexture' );
    program.projectionMatrix = gl.getUniformLocation( program, 'projectionMatrix' );
    program.modelViewMatrix = gl.getUniformLocation( program, 'modelViewMatrix' );

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
var getFillUniforms = function ( program ) {
    gl.useProgram( program );
    program.position = gl.getAttribLocation( program, 'position' );
    program.texCoord = gl.getAttribLocation( program, 'texCoord' );
    program.volumeDimensions = gl.getUniformLocation( program, 'volumeDimensions' );
    program.sliceLayout = gl.getUniformLocation( program, 'sliceLayout' );
    program.seedOrigin = gl.getUniformLocation( program, 'seedOrigin' );
    program.seedRadius = gl.getUniformLocation( program, 'seedRadius' );

    gl.enableVertexAttribArray( program.position );
    gl.enableVertexAttribArray( program.texCoord );
};


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
    /*
     [ //GL_TRIANGLES
     -1.0, -1.0,
     1.0, -1.0,
     -1.0,  1.0,
     -1.0,  1.0,
     1.0, -1.0,
     1.0,  1.0 ]
     */
    gl.bindBuffer( gl.ARRAY_BUFFER, position2DBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( positionVertices ), gl.STATIC_DRAW );

    texCoord2DBuffer = gl.createBuffer();
    var textureCoords =  // GL_TRIANGLE_STRIP
        [ 0.0, 0.0,
            1.0, 0.0,
            0.0, 1.0,
            1.0, 1.0 ];
    /*
     [ //GL_TRIANGLES
     0.0,  0.0,
     1.0,  0.0,
     0.0,  1.0,
     0.0,  1.0,
     1.0,  0.0,
     1.0,  1.0 ]
     */
    gl.bindBuffer( gl.ARRAY_BUFFER, texCoord2DBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( textureCoords ), gl.STATIC_DRAW );
}

function create3DBuffers() {
    position3DBuffer = gl.createBuffer();
    /*var v0 = [  1,  1,  1 ],
        v1 = [ -1,  1,  1 ],
        v2 = [ -1, -1,  1 ],
        v3 = [  1, -1,  1 ],
        v4 = [  1, -1, -1 ],
        v5 = [  1,  1, -1 ],
        v6 = [ -1,  1, -1 ],
        v7 = [ -1, -1, -1 ];
    */
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

    var dX = 1.0;
    var dY = 1.0;
    var dZ = 1.0;

    var cubeVerticesArray = [
        -dX,-dY,-dZ,	-dX,-dY, dZ,	-dX, dY, dZ,	//1		- left
        dX, dY,-dZ,	-dX,-dY,-dZ,	-dX, dY,-dZ,	//2		- back
        dX,-dY, dZ,	-dX,-dY,-dZ,	 dX,-dY,-dZ,	//3		- bottom
        dX, dY,-dZ,	 dX,-dY,-dZ,	-dX,-dY,-dZ,	//4		- back
        -dX,-dY,-dZ,	-dX, dY, dZ,	-dX, dY,-dZ,	//5		- left
        dX,-dY, dZ,	-dX,-dY, dZ,	-dX,-dY,-dZ,	//6		- bottom
        -dX, dY, dZ,	-dX,-dY, dZ,	 dX,-dY, dZ,	//7		- front
        dX, dY, dZ,	 dX,-dY,-dZ,	 dX, dY,-dZ,	//8		- right
        dX,-dY,-dZ,	 dX, dY, dZ,	 dX,-dY, dZ,	//9		- right
        dX, dY, dZ,	 dX, dY,-dZ,	-dX, dY,-dZ,	//10	- top
        dX, dY, dZ,	-dX, dY,-dZ,	-dX, dY, dZ,	//11	- top
        dX, dY, dZ,	-dX, dY, dZ,	dX,-dY, dZ,	];	//12	- front



    gl.bindBuffer( gl.ARRAY_BUFFER, position3DBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( cubeVerticesArray ), gl.STATIC_DRAW );

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

init();

function init() {

    resizeCanvas();
    initCamera();

    var volume_async_load = jQuery.Deferred();

    var sourceImage = new Image();
    sourceImage.onload = function() {
        sourceVolume = createTexture( gl, sourceImage );

        var sourceWidth = sourceImage.width; // should equal width * slices_x
        var sourceHeight = sourceImage.height; // should equal height * slices_y


        //create two fbos to alternately draw to them during iterations
        frameBuffers = [ createFBO( gl, [ sourceWidth, sourceHeight ] ),
                         createFBO( gl, [ sourceWidth, sourceHeight ] ) ];

        volume_async_load.resolve();
    };
    sourceImage.src = 'res/bonsai256x256x256.png';
    //sourceImage.src = 'res/heart128x128x256.png';
    //sourceImage.src = 'res/teapot256x256x256.png';

    seedOrigin = [ 0.5, 0.75, 0.25 ];
    seedRadius = 0.3;

    create2DBuffers();
    create3DBuffers();

    var fill_async_load = setupShaders( 'shaders/initialize_sdf.frag', 'shaders/basic.vert' );
    var debug_async_load = setupShaders( 'shaders/debug_texture.frag', 'shaders/basic.vert' );
    var backfaces_async_load = setupShaders( 'shaders/backfaces.frag', 'shaders/backfaces.vert' );
    var raytrace_async_load = setupShaders( 'shaders/raytrace.frag', 'shaders/raytrace.vert' );

    $.when( fill_async_load,
            debug_async_load,
            backfaces_async_load,
            raytrace_async_load,
            volume_async_load ).done(
        function ( program_fill,
                   program_debug,
                   program_backfaces,
                   program_raytrace ) {
        getFillUniforms( program_fill );
        program_fill.render = initializeSDF;
        programs.push( program_fill );

        getDebugUniforms( program_debug );
        program_debug.render = renderToDebugTexture;
        programs.push( program_debug );

        getBackfacesUniforms( program_backfaces );
        program_backfaces.render = renderBackfaces;
        programs.push( program_backfaces );

        getRaytraceUniforms( program_raytrace );
        program_raytrace.render = renderRaytrace;
        programs.push( program_raytrace );

        render();
    } );
}


function render() {
    if( programs === undefined || programs.length == 0 ) return;

    var program_fill = programs[ 0 ];
    var program_debug = programs[ 1 ];
    var program_backfaces = programs[ 2 ];
    var program_raytrace = programs[ 3 ];

    //render to FBO
    program_fill.render( frameBuffers[ 0 ], seedOrigin, seedRadius );

    //render a texture to fullscreen (for debug purposes)
    //program_debug.render( frameBuffers[ 0 ].texture );

    program_backfaces.render( backfaceFrameBuffer );
    program_raytrace.render( sourceVolume, frameBuffers[ 0 ].texture, backfaceFrameBuffer.texture );

    window.update( render );
}


function renderBox( program ) {

    gl.bindBuffer( gl.ARRAY_BUFFER, position3DBuffer );
    gl.vertexAttribPointer( program.position, 3, gl.FLOAT, false, 0, 0 );


    gl.bindBuffer( gl.ARRAY_BUFFER, texCoord3DBuffer );
    gl.vertexAttribPointer( program.texCoord, 3, gl.FLOAT, false, 0, 0 );

    gl.drawArrays( gl.TRIANGLES, 0, 36 );

    gl.bindBuffer( gl.ARRAY_BUFFER, null );
}


function renderQuad( program ) {
    gl.bindBuffer( gl.ARRAY_BUFFER, position2DBuffer );
    gl.vertexAttribPointer( program.position, 3, gl.FLOAT, false, 0, 0 );

    gl.bindBuffer( gl.ARRAY_BUFFER, texCoord2DBuffer );
    gl.vertexAttribPointer( program.texCoord, 2, gl.FLOAT, false, 0, 0 );

    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );

    gl.bindBuffer( gl.ARRAY_BUFFER, null );
}

function initializeSDF ( frameBuffer, seedOrigin, seedRadius ) {
    var program = this;
    gl.viewport( 0, 0, frameBuffer.width, frameBuffer.height );
    gl.clearColor( 1.0, 0.5, 0.2, 1.0 );
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    //TODO don't do this every render pass
    gl.useProgram( program );

    gl.uniform2f( program.sliceLayout, slices_x, slices_y );
    gl.uniform2f( program.volumeDimensions, width, height );
    gl.uniform3f( program.seedOrigin, seedOrigin[ 0 ], seedOrigin[ 1 ], seedOrigin[ 2 ] );
    gl.uniform1f( program.seedRadius, seedRadius );

    gl.bindFramebuffer( gl.FRAMEBUFFER, frameBuffer.buffer );

    renderQuad( program );
    //gl.drawArrays( gl.TRIANGLES, 0, 6 );
    gl.bindFramebuffer( gl.FRAMEBUFFER, null );
}

function renderToDebugTexture( texture ) {
    var program = this;
    gl.useProgram( program );
    gl.viewport( 0, 0, renderCanvas.width, renderCanvas.height );

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.uniform1i( program.texture, 0 );

    renderQuad( program );

    gl.bindTexture( gl.TEXTURE_2D, null );
}

function renderBackfaces( frameBuffer ) {
    var program = this;
    
    gl.enable( gl.CULL_FACE );
    gl.enable( gl.DEPTH_TEST );
    gl.cullFace( gl.FRONT );

    gl.viewport( 0, 0, renderCanvas.width, renderCanvas.height );
    gl.clearColor( 0.2, 0.2, 0.2, 0.0 );
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    gl.useProgram( program );

    gl.uniformMatrix4fv( program.projectionMatrix, false, camera.projectionMatrix );
    gl.uniformMatrix4fv( program.modelViewMatrix, false, camera.modelViewMatrix );

    gl.bindFramebuffer( gl.FRAMEBUFFER, frameBuffer.buffer );

    renderBox( program );

    gl.bindFramebuffer( gl.FRAMEBUFFER, null );
}

function renderRaytrace( volumeTexture, sdfTexture, backfaceTexture ) {
    var program = this;
    gl.viewport( 0, 0, renderCanvas.width, renderCanvas.height );

    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT  );

    gl.useProgram( program );
    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, sdfTexture );
    gl.uniform1i( program.sdfBuffer, 0 );

    gl.activeTexture( gl.TEXTURE1 );
    gl.bindTexture( gl.TEXTURE_2D, backfaceTexture );
    gl.uniform1i( program.backfaceBuffer, 1 );

    gl.activeTexture( gl.TEXTURE2 );
    gl.bindTexture( gl.TEXTURE_2D, volumeTexture );
    gl.uniform1i( program.volumeTexture, 2 );

    gl.uniform1f( program.iGlobalTime, ( Date.now() - start ) / 1000.0 );
    gl.uniform2f( program.iResolution, renderCanvas.width, renderCanvas.height );

    gl.uniformMatrix4fv( program.projectionMatrix, false, camera.projectionMatrix );
    gl.uniformMatrix4fv( program.modelViewMatrix, false, camera.modelViewMatrix );


    //gl.enable( gl.BLEND );
    gl.cullFace( gl.BACK );

    //renderQuad( program )
    renderBox( program );
}