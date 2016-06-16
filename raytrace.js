'use strict';

//var drawTriangle = require( 'a-big-triangle' );
//var createTexture = require( 'gl-texture2d' );
//var createFBO = require( 'gl-fbo' );
//var context = require( 'gl-context' );
//var Shader = require( 'gl-shader' );
//var glslify = require( 'glslify' );
//var ndarray = require( 'ndarray' );
//var fill = require( 'ndarray-fill' );


var renderCanvas = document.querySelector( '#renderCanvas' );

var start = Date.now();
var width = 128,
    height = 128,
    slices_x = 16,
    slices_y = 16;

var frameBuffers, sourceVolume;
var seedOrigin;
var seedRadius;

var programs = [];

var positionBuffer,
    texCoordBuffer;

var gl = renderCanvas.getContext( 'webgl' );

// load extensions for float textures
gl.getExtension( 'OES_texture_float' );
gl.getExtension( 'OES_texture_float_linear' );

if ( !gl ) {
    alert( 'Your browser does not support WebGL. ' +
        'Please use a WebGL-enabled explorer such as Chrome.' );
}


function createTexture( gl, texImage ) {
    var texture = gl.createTexture();

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, texture );
    //TODO: make flip_y optional
    gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, true );
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texImage );
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

            program.name = fragmentShaderPath.slice( 0, -4 );
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

var getUniforms = function ( program ) {
    gl.useProgram( program );

    program.iResolution = gl.getUniformLocation( program, 'iResolution' );
    program.iGlobalTime = gl.getUniformLocation( program, 'iGlobalTime' );
    program.sdfBuffer = gl.getUniformLocation( program, 'sdfBuffer' );
    program.sourceTexture = gl.getUniformLocation( program, 'sourceTexture' );
}

var updateUniformLocations = function ( gl, program ) {
    gl.uniform2f( program.iResolution, $( renderCanvas ).width(), $( renderCanvas ).height() );
    gl.uniform1f( program.iGlobalTime, (Date.now() - start ) / 1000.0 );
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
}


var getDebugUniforms = function ( program ) {
    program.position = gl.getAttribLocation( program, 'position' );
    program.texCoord = gl.getAttribLocation( program, 'texCoord' );
    program.distanceTexture = gl.getUniformLocation( program, 'texture' );
}

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
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );

    // attach texture to frame buffer
    gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTexture, 0 );
    gl.clear( gl.COLOR_BUFFER_BIT );

    return { frameBuffer: fbo, texture: fboTexture, width: dimensions[ 0 ], height: dimensions[ 1 ] };
}

function resizeCanvas() {
    var canvas_width = window.innerWidth;
    var canvas_height = window.innerHeight;

    renderCanvas.width = canvas_width;
    renderCanvas.height = canvas_height;

    renderCanvas.style.width = canvas_width + 'px';
    renderCanvas.style.height = canvas_height + 'px';
    renderCanvas.style.position = renderCanvas.style.position || 'absolute';

    render();
}

//adjust canvas dimensions and rerender on resize
window.addEventListener( 'resize', resizeCanvas, false );

init();

function init() {
    resizeCanvas();

    var sourceImage = $( '#sourceImage' );
    var fboWidth = sourceImage[ 0 ].width; // should equal width * slices_x
    var fboHeight = sourceImage[ 0 ].height; // should equal height * slices_y

    //create two fbos to alternately draw to them during iterations
    frameBuffers = [ createFBO( gl, [ fboWidth, fboHeight ] ),
                     createFBO( gl, [ fboWidth, fboHeight ] ) ];

    sourceVolume = createTexture( gl, sourceImage[ 0 ] );
    sourceImage.hide();

    seedOrigin = [ 0.5, 0.5, 0.5 ];
    seedRadius = 0.35;

    positionBuffer = gl.createBuffer();
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
    gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( positionVertices ), gl.STATIC_DRAW );

    texCoordBuffer = gl.createBuffer();
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
    gl.bindBuffer( gl.ARRAY_BUFFER, texCoordBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( textureCoords ), gl.STATIC_DRAW );

    var fill_async_load = setupShaders( 'shaders/initialize_sdf.frag', 'shaders/basic.vert' );
    var debug_async_load = setupShaders( 'shaders/debug_texture.frag', 'shaders/basic.vert' );

    $.when( fill_async_load, debug_async_load ).done( function ( program_fill, program_debug ) {
        getFillUniforms( program_fill );
        program_fill.render = renderToFBO;
        programs.push( program_fill );

        getDebugUniforms( program_debug );
        program_debug.render = renderToDebugTexture;
        programs.push( program_debug );

        render();
    } );
}


function render() {
    if( programs === undefined || programs.length == 0 ) return;
    
    var program_fill = programs[ 0 ];
    var program_debug = programs[ 1 ];

    //render to FBO
    program_fill.render( frameBuffers[ 0 ], seedOrigin, seedRadius );

    //render a texture to fullscreen (for debug purposes)
    program_debug.render( frameBuffers[ 0 ].texture );

    /*
     updateUniformLocations( gl, program );

     gl.activeTexture( gl.TEXTURE2 );  // bind sourceTexture to texture unit 0
     gl.bindTexture( gl.TEXTURE_2D, frameBuffers[ 0 ].texture );
     gl.uniform1i( program.sdfBuffer, 0 ); // then, assign sourceTextureSampler to this texture unit

     drawTriangle( gl );
     */
}

function renderToFBO ( frameBuffer, seedOrigin, seedRadius ) {
    var program = this;
    gl.viewport( 0, 0, frameBuffer.width, frameBuffer.height );
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    //TODO don't do this every render pass
    gl.useProgram( program );

    gl.uniform2f( program.sliceLayout, slices_x, slices_y );
    gl.uniform2f( program.volumeDimensions, width, height );
    gl.uniform3f( program.seedOrigin, seedOrigin[ 0 ], seedOrigin[ 1 ], seedOrigin[ 2 ] );
    gl.uniform1f( program.seedRadius, seedRadius );

    gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
    gl.enableVertexAttribArray( program.position );
    gl.vertexAttribPointer( program.position, 3, gl.FLOAT, false, 0, 0 );

    gl.bindBuffer( gl.ARRAY_BUFFER, texCoordBuffer );
    gl.enableVertexAttribArray( program.texCoord );
    gl.vertexAttribPointer( program.texCoord, 2, gl.FLOAT, false, 0, 0 );

    gl.bindFramebuffer( gl.FRAMEBUFFER, frameBuffer.frameBuffer );

    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
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

    gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
    gl.enableVertexAttribArray( program.position );
    gl.vertexAttribPointer( program.position, 3, gl.FLOAT, false, 0, 0 );

    gl.bindBuffer( gl.ARRAY_BUFFER, texCoordBuffer );
    gl.enableVertexAttribArray( program.texCoord );
    gl.vertexAttribPointer( program.texCoord, 2, gl.FLOAT, false, 0, 0 );

    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
}
