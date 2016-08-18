'use strict';

let slices = { x: 16, y: 16 };
let tiles = slices;
let width = 128,
    height = width,
    depth = 128;//slices.x * slices.y;

//let seedOrigin = [ 0.58, 0.11, 0.3 ];
let seedOrigin = { x: 0.46, y: 0.41, z: 0.52 };//bonsai
//let seedOrigin = { x: 0.4, y: 0.6, z: 0.22 };//foot
//let seedOrigin = { x: 0.64, y: 0.64, z: 0.64 };
let seedRadius = 0.1;
let targetIntensity = 100;//-1.;
let alpha = 1.;
let sensitivity = 0.15;

let updating = false;

let volumePath;
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


function resizeCanvases() {
    for( let index = 0; index < canvases.length; index++ ) {
        let canvas = canvases[ index ];
        resizeCanvas( canvas );
    }
}

// make canvases fullscreen
function resizeCanvas( canvas ) {

    let canvas_width = Math.floor( window.innerWidth / canvases.length );//debug set canvas width width * slices.x;//
    let canvas_height = window.innerHeight; //debug set canvas height height * slices.y;//

    canvas.width = canvas_width;
    canvas.height = canvas_height;

    canvas.style.width = canvas_width + 'px';
    canvas.style.height = canvas_height + 'px';
    //canvas.style.position = canvas.style.position || 'absolute';

    canvas.backfaceFrameBuffer = createFBO.call( canvas, [ canvas_width, canvas_height ] );

    if( camera ) {
        camera.setAspectRatio( canvas.width, canvas.height );
        camera.update();
    }

    //animate();
}

//adjust canvas dimensions and re-render on resize
window.addEventListener( 'resize', resizeCanvases, false );

////////////////////////////////////////////////////////////////////////////////
// CAMERA SETUP
////////////////////////////////////////////////////////////////////////////////

let camera;

function initCamera() {
    camera = createCamera(  [ 0, 0, -4 ], /* eye vector */
        [ 0, 0, 0 ], /* target */
        [ 0, 1, 0 ] ); /* up vector */
    //camera.setAspectRatio( canvases[ 0 ].width, canvases[ 0 ].height );
    //camera.update();
}

/////////////////////////////////

//todo consider non-power of two support
function createTextureFromImage( image ) {
    let gl = this.context;

    let texture = gl.createTexture();

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, texture );
    //TODO: make flip_y optional
    gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, true );
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
    gl.bindTexture( gl.TEXTURE_2D, null );

    return texture;
}

function createTextureFromSize( dimensions ) {
    let gl = this.context;

    let texture = gl.createTexture();

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, texture );
    /*
     //TODO: make flip_y optional
     gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, true );*/
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, dimensions[ 0 ], dimensions[ 1 ], 0, gl.RGBA, gl.FLOAT/*UNSIGNED_BYTE*/, null ); //creates 32bit float texture
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
    gl.bindTexture( gl.TEXTURE_2D, null );

    return texture;
}

function create3DTexture( dimensions ) {
    let gl = this.context;
    let texture = gl.createTexture();

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
let setupShaders = function ( vertexShaderPath, fragmentShaderPath, uniforms ) {
    let gl = this.context;

    let deferred = $.Deferred();
    var shaders = loadShaders( [ vertexShaderPath, fragmentShaderPath ],
        /* Callback function initializing shaders when all resources have been loaded */
        function() {
            let program = gl.createProgram();

            var success = true;

            shaders.forEach(function( shaderObject ) {
                let shader = gl.createShader(
                    shaderObject.type == 'fragment' ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER
                );
                let shaderSource = shaderObject.source;

                if( gl.type === 'webgl' ) {
                    shaderSource = convertShader( shaderSource, shaderObject.type );
                }

                gl.shaderSource( shader, shaderSource );

                gl.compileShader( shader );
                if ( !gl.getShaderParameter( shader, gl.COMPILE_STATUS ) ) {
                    //alert( 'could not compile ' + shaderObject.type + ' shader \'' + shaderObject.path + '\'' );
                    console.error( gl.getShaderInfoLog( shader ) );
                    success = false;
                    return false;
                } else {
                    console.log( 'compiled ' + shaderObject.type + ' shader \'' + shaderObject.path + '\'' );
                }

                gl.attachShader( program, shader );
                gl.deleteShader( shader );
            });

            if( !success ) {
                deferred.reject();
            }

            gl.linkProgram( program );

            //name program by fragment shader name minus extension minus folder
            program.name = fragmentShaderPath.slice( 0, -5 ).slice( fragmentShaderPath.indexOf( '/' ) + 1 );

            if ( !gl.getProgramParameter( program, gl.LINK_STATUS ) ) {
                console.error( gl.getProgramInfoLog( program ) );
                alert( 'could not initialise shaders for ' + program.name + ' program' );
            }

            //Todo init attrib & uniforms?
            deferred.resolve( [ program, uniforms ] );
        } );

    return deferred.promise();
};

function convertShader( shaderSource, shaderType ) {
    /* Remove occurrences of “#version” until next newline */
    let index = shaderSource.search( /#version/ );
    if( index >= 0 ) {
        let nextLinebreak = shaderSource.substr( index ).search( /\r|\n/ );
        shaderSource = shaderSource.slice( 0, index ).concat( shaderSource.slice( index + nextLinebreak + 1 ) );
    }
    switch( shaderType ) {
        case 'vertex':
            /* Vertex shaders: exchange “in” for “attribute”, exchange “out” for “varying” */
            shaderSource = shaderSource.replace( /\b(in)\b/g, 'attribute' );
            shaderSource = shaderSource.replace( /\b(out)\b/g, 'varying' );
            break;
        case 'fragment':
            /* Fragment shaders: exchange “in” for “varying” */
            shaderSource = shaderSource.replace( /\b(in)\b/g, 'varying' );

            /* parse name of out vec4 and replace name with gl_FragColor */
            index = shaderSource.search( /\b(out vec4)\b/g );
            let nextSemicolon = shaderSource.substr( index + 9 ).search( /(;)/ );
            let outName = shaderSource.slice( index + 9, index + 9 + nextSemicolon );
            //remove line containing out vec4 from shader
            shaderSource = shaderSource.slice( 0, index ).concat( shaderSource.slice( index + 9 + nextSemicolon + 1 ) );

            let regexOutName = new RegExp( '\\b(' + outName + ')\\b', 'g' );
            shaderSource = shaderSource.replace( regexOutName, 'gl_FragColor' );
            break;
    }

    /* Look for occurrences of “sampler” and make list of “sampler2D” variable names and “sampler3D” variable names */
    let sampler2Ds = [],
        sampler3Ds = [];
    let regex = /sampler[23]D/g, regexLength = 9, result;

    while ( ( result = regex.exec( shaderSource ) ) != null ) {
        let nextSemicolonOrComma = shaderSource.substr( result.index + regexLength ).search( /[;,]/ );
        if( nextSemicolonOrComma > 0 ) {
            let inbetween = shaderSource.substr( result.index + regexLength, nextSemicolonOrComma ).trim();

            if( /2/.test(result[ 0 ] ) ) {
                sampler2Ds.push( inbetween );
            }

            if( /3/.test(result[ 0 ] ) ) {
                sampler3Ds.push( inbetween );
            }
        } else {
            //todo otherwise delete entire line (precision specifier)
        }
    }

    /* Substitute “sampler3D” with “sampler2D” */
    shaderSource = shaderSource.replace( regex, 'sampler2D' );

    if( sampler3Ds.length > 0 ) {
        //find first function in shader
        let firstCurlyBrace = shaderSource.search( /{/ );
        let firstSemicolonBeforeThat = shaderSource.lastIndexOf( ';', firstCurlyBrace );

        let polyfill3DtexturesTrilinear = `
uniform vec2 tiles;

vec4 sampleAs3DTexture( sampler2D volume, vec3 texCoord ) {
    texCoord = clamp( texCoord, 0., 1. );

    float volumeDepth = tiles.x * tiles.y;
    float max_slice = volumeDepth - 1.;
    vec2 slice1, slice2;
    
    //z coordinate determines which 2D tile we sample from
    //z slice number runs from 0 to 255.
    //sample two slices to do trilinear sampling
    float slice1_z = floor( texCoord.z * max_slice );
    float slice2_z = clamp( slice1_z + 1., 0., max_slice );
    
    float dx1 = mod( slice1_z, tiles.x );
    float dy1 = floor( slice1_z / tiles.x );
    
    float dx2 = mod( slice2_z, tiles.x );
    float dy2 = floor( slice2_z / tiles.x );
    
    slice1.x = ( texCoord.x + dx1 ) / tiles.x;
    slice1.y = ( texCoord.y + dy1 ) / tiles.y;
    
    slice2.x = ( texCoord.x + dx2 ) / tiles.x;
    slice2.y = ( texCoord.y + dy2 ) / tiles.y;
    
    //bilinear filtering is done at each texture2D lookup by default
    vec4 color1 = texture2D( volume, slice1 );
    vec4 color2 = texture2D( volume, slice2 );
    
    float zDifference = mod( texCoord.z * max_slice, 1.0 );
    //interpolate between the two intermediate colors of each slice
    return mix( color1, color2, zDifference );
}`;

        let polyfill3Dtextures = `
uniform vec2 tiles;

vec4 sampleAs3DTexture( sampler2D volume, vec3 texCoord ) {
    texCoord = clamp( texCoord, 0., 1. );
    
    float volumeDepth = tiles.x * tiles.y;
    float max_slice = volumeDepth;
    
    vec2 slice;

    float slice_z = floor( texCoord.z * max_slice );
    
    float dx = mod( slice_z, tiles.x );
    float dy = floor( slice_z / tiles.x );

    slice.x = ( texCoord.x + dx ) / tiles.x;
    slice.y = ( texCoord.y + dy ) / tiles.y;

    return texture2D( volume, slice );
}`;
        //insert polyfill function as first function in shader
        if( shaderSource.search( 'trilinear' ) != -1 ) {
            shaderSource = shaderSource.slice( 0, firstSemicolonBeforeThat + 1 ).concat( polyfill3DtexturesTrilinear ).concat( shaderSource.slice( firstSemicolonBeforeThat + 2 ) );
        } else {
            shaderSource = shaderSource.slice( 0, firstSemicolonBeforeThat + 1 ).concat( polyfill3Dtextures ).concat( shaderSource.slice( firstSemicolonBeforeThat + 2 ) );
        }
        //DEBUG
        //console.log( shaderSource );
    }

    regex = /\btexture\(/g;
    while ( result = regex.exec( shaderSource ) ) {
        //comma has to follow since texture requires two arguments
        let nextComma = shaderSource.substr( result.index + regexLength ).search( /,/ );
        if( nextComma == 0 ) continue;

        let inbetween = shaderSource.substr( result.index + regexLength, nextComma ).trim();

        let find2D = sampler2Ds.indexOf( inbetween );
        let find3D = sampler3Ds.indexOf( inbetween );

        if( find2D > -1 ) {
            shaderSource = shaderSource.slice( 0, result.index ).concat( 'texture2D' ).concat( shaderSource.slice( result.index + 7 ) );
        } else if( find3D > -1 ) {
            shaderSource = shaderSource.slice( 0, result.index ).concat( 'sampleAs3DTexture' ).concat( shaderSource.slice( result.index + 7 ) );
        }
    }

    /* trim excess whitespace and superfluous newlines from both sides of the code */
    shaderSource = shaderSource.replace(/^\s+|\s+$/g, '');

    /* remove >2 linebreaks and replace with single empty line (for OCD people) */
    shaderSource = shaderSource.replace(/\n\s*\n\s*\n/g, '\n\n');

    return shaderSource;
}


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
function createFBO( dimensions ) {
    let gl = this.context;
    // create a texture for the frame buffer

    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer( gl.FRAMEBUFFER, fbo );
    gl.clearColor( 0.5, 0.5, 0.5, 1.0 );

    let fboTexture;
    //create 2D or 3D framebuffer
    switch ( dimensions.length ) {
        case 3:
            if( gl.type === 'webgl2' ) {
                fboTexture = create3DTexture.call( this, dimensions );
                for( let layer = 0; layer < depth; layer++ ) {
                    gl.framebufferTextureLayer( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, fboTexture, 0, layer );
                }
                break;
            } else {
                tiles = { x: slices.x, y: Math.ceil( dimensions[ 2 ] / slices.x ) };
                console.log(' creating tiled texture with ' + tiles.x + ' by ' + tiles.y + ' tiles for WebGL compatibility. ');

                dimensions[ 0 ] *= tiles.x;
                dimensions[ 1 ] *= tiles.y;
                dimensions.splice( 2, 1 );

                // fallthrough: continue to 2d case
                /*fboTexture = createTextureFromSize.call( this, dimensions );
                gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTexture, 0 );*/
            }
        case 2:
            fboTexture = createTextureFromSize.call( this, dimensions );
            gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTexture, 0 );
            break;
        default:
            console.log( dimensions.length + ' is not a valid number of dimensions for FBO creation.');
    }

    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.bindFramebuffer( gl.FRAMEBUFFER, null );

    if ( gl.checkFramebufferStatus( gl.FRAMEBUFFER ) != gl.FRAMEBUFFER_COMPLETE ) {
        console.log( 'framebuffer incomplete: ' + gl.checkFramebufferStatus( gl.FRAMEBUFFER ).toString( 16 ) );
    }

    console.log( '... created FBO with dimensions ' + dimensions[ 0 ] + 'x' + dimensions[ 1 ] + ( dimensions[ 2 ] ? ( 'x' + dimensions[ 2 ] ) : '' ) );
    return { buffer:    fbo,
             texture:   fboTexture,
             type:      dimensions.length == 2 ? gl.TEXTURE_2D : gl.TEXTURE_3D,
             width:     dimensions[ 0 ],
             height:    dimensions[ 1 ],
             depth:     dimensions.length > 2 ? dimensions[ 2 ] : undefined };
}

function create2DBuffers() {
    let gl = this.context;

    this.position2DBuffer = gl.createBuffer();
    let positionVertices =  // GL_TRIANGLE_STRIP
        [   -1., -1., 0.,     // bottom left corner
            1., -1., 0.,     // bottom right corner
            -1.,  1., 0.,     // top left corner
            1.,  1., 0. ];   // top right corner
    let positionVerticesTriangle = //GL_TRIANGLES
        [   -1., -1.,
            1., -1.,
            -1.,  1.,
            -1.,  1.,
            1., -1.,
            1.,  1. ];
    gl.bindBuffer( gl.ARRAY_BUFFER, this.position2DBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( positionVerticesTriangle ), gl.STATIC_DRAW );
    gl.bindBuffer( gl.ARRAY_BUFFER, null );

    this.texCoord2DBuffer = gl.createBuffer();
    let textureCoords =  // GL_TRIANGLE_STRIP
        [   0., 0.,
            1., 0.,
            0., 1.,
            1., 1. ];
    let textureCoordsTriangle = //GL_TRIANGLES
        [   0., 0.,
            1., 0.,
            0., 1.,
            0., 1.,
            1., 0.,
            1., 1. ];
    gl.bindBuffer( gl.ARRAY_BUFFER, this.texCoord2DBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( textureCoordsTriangle ), gl.STATIC_DRAW );
    gl.bindBuffer( gl.ARRAY_BUFFER, null );
}

function create3DBuffers() {
    let gl = this.context;

    this.position3DBuffer = gl.createBuffer();

    let v0 = [ -1, -1, -1 ], t0 = [ 0, 0, 0 ],
        v1 = [ -1, -1,  1 ], t1 = [ 0, 0, 1 ],
        v2 = [ -1,  1,  1 ], t2 = [ 0, 1, 1 ],
        v3 = [  1,  1, -1 ], t3 = [ 1, 1, 0 ],
        v4 = [ -1,  1, -1 ], t4 = [ 0, 1, 0 ],
        v5 = [  1, -1,  1 ], t5 = [ 1, 0, 1 ],
        v6 = [  1, -1, -1 ], t6 = [ 1, 0, 0 ],
        v7 = [  1,  1,  1 ], t7 = [ 1, 1, 1 ];

    let positionVertices = [];
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

    gl.bindBuffer( gl.ARRAY_BUFFER, this.position3DBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( positionVertices ), gl.STATIC_DRAW );

    this.texCoord3DBuffer = gl.createBuffer();
    let textureCoords = [];
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

    gl.bindBuffer( gl.ARRAY_BUFFER, this.texCoord3DBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( textureCoords ), gl.STATIC_DRAW );
}

initCamera();
let canvases = document.querySelectorAll( '.renderCanvas' );
/*
 // get gl2Canvas from DOM
 let gl2Canvas = document.querySelector( '#gl2Canvas' );
 let glCanvas = document.querySelector( '#glCanvas' );
 */

for( let index = 0; index < canvases.length; index++ ) {
    let canvas = canvases[ index ];

    // OpenGL context
    let glType = $( canvas ).data( 'gltype' );

    let gl = canvas.getContext( glType, { antialias: false, preserveDrawingBuffer: true } );

    let isGL = !!gl;
    if( !isGL ) {
        //$( 'body' ).prepend( '<div id="log"></div>' );
        if( glType === 'webgl2' ) {
            $( '#log' ).html( 'WebGL 2.0 is not available in your browser.  See <a href="https://www.khronos.org/webgl/wiki/Getting_a_WebGL_Implementation">How to run WebGL 2.0</a>' );
        } else {
            $( '#log' ).html( 'WebGL is not available in your browser.  See <a href="https://www.khronos.org/webgl/wiki/Getting_a_WebGL_Implementation">How to run WebGL</a>' );
        }
    }

    if( gl ) {
        canvas.context = gl;
        gl.type = glType;

        // load extensions for float textures
        gl.getExtension( 'OES_texture_float' );
        gl.getExtension( 'OES_texture_float_linear' );

        init( canvas );
        //gl.renderCanvas = canvas;
    }
}

function getSeedValue() {
    var canvas = document.createElement( 'canvas' );

    var img = this.sourceImage;

    canvas.width = img.width;
    canvas.height = img.height;

    var context = canvas.getContext( '2d' );
    context.drawImage( img, 0, 0 );

    let numTiles = tiles.x * tiles.y;
    let dx = ( seedOrigin.z * numTiles ) % tiles.x;
    let dy = Math.floor( ( seedOrigin.z * numTiles ) / tiles.x );

    let px = ( seedOrigin.x + dx ) / tiles.x;
    let py = ( seedOrigin.y + dy ) / tiles.y;

    px *= img.width;
    py *= img.height;

    px = Math.round( px );
    py = Math.round( py );

    if( px > img.width || py > img.height || px < 0 || py < 0 ) {
        console.log('fu');
    }

    var imageData = context.getImageData( px, py, 1, 1 );
    var voxel = imageData.data;
    //return texture( volume, slice );

    var rgba = 'rgba(' + voxel[ 0 ] + ',' + voxel[ 1 ] + ',' + voxel[ 2 ] + ',' + voxel[ 3 ] + ')';
    //$('#log')[0].style.background = rgba;
    $('#log').css( 'background-color', rgba );
    $('#log').html( rgba );

    console.log( rgba );
    targetIntensity = voxel[ 0 ];

    return voxel;
}

function init( canvas ) {
    canvas.busy = false;

    let gl = canvas.context;

    resizeCanvas( canvas );

    let volume_async_load = jQuery.Deferred();

    let sourceImage = new Image();
    sourceImage.onload = function () {
        //load tiled volume from PNG to texture
        canvas.tiledVolume = createTextureFromImage.call( canvas, sourceImage );
        //create 3D FBO for 3D volume texture
        canvas.volumeFrameBuffer = createFBO.call( canvas, [ width, height, depth ] );

        //create two fbos to alternately draw to them during iterations
        canvas.frameBuffers = [ createFBO.call( canvas, [ width, height, depth ] ),
                                createFBO.call( canvas, [ width, height, depth ] ) ];

        canvas.sourceImage = sourceImage;
        volume_async_load.resolve();
    };
    sourceImage.src = volumePath;

    create2DBuffers.call( canvas );
    create3DBuffers.call( canvas );


    let quad_vert = 'shaders_webgl2/quad.vert';
    let box_vert  = 'shaders_webgl2/projected_box.vert';

    let attribs = [ 'position', 'texCoord' ];

    //TODO: parse uniforms from shader? create shader and add uniforms to shader string?
    //parsing uniforms from shader code shouldn't be too hard ... actually

    //list of shaders
    //format: [ vertexShaderPath, fragmentShaderPath, Array_of_uniforms, renderFunction
    let shaderPairs = [
        [ quad_vert, 'shaders_webgl2/initialize_volume.frag',
            [   'tiles',
                'layer' ]
        ],
        [ quad_vert, 'shaders_webgl2/initialize_sdf.frag',
            [   'numLayers',
                'tiles',
                'layer',
                'volumeDimensions',
                'seedOrigin',
                'seedRadius' ]
        ],
        [ quad_vert, 'shaders_webgl2/update_sdf.frag',
            [   'numLayers',
                'layer',
                'tiles',
                'volumeDimensions',
                'seedOrigin',
                'targetIntensity',
                'alpha',
                'sensitivity',
                'distanceFieldTexture',
                'volumeTexture' ]
        ],
        [ quad_vert, 'shaders_webgl2/debug_texture.frag',
            [   'tex',
                'tiles' ]
        ],
        [ box_vert,  'shaders_webgl2/backfaces.frag',
            [   'projectionMatrix',
                'modelViewMatrix' ]
        ],
        [ box_vert,  'shaders_webgl2/raytrace.frag',
            [   'distanceFieldTexture',
                'tiles',
                'backfaceTexture',
                'volumeDimensions',
                'volumeTexture',
                'projectionMatrix',
                'modelViewMatrix' ]
        ]
    ];

    let deferreds = $.map( shaderPairs, function( current ) {
        return setupShaders.call( canvas, current[ 0 ], current[ 1 ], current[ 2 ] );
    });

    deferreds.push( volume_async_load );

    let getLocations = function ( program, attribs, uniforms ) {
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
        canvas.programs = {};

        for( let i = 0; i < arguments.length; i++ ) {
            if ( arguments[ i ] === undefined ) {
                continue;
            }
            let program = arguments[ i ][ 0 ];
            let uniforms = arguments[ i ][ 1 ];
            //get uniform locatios for all uniforms in list
            getLocations( program, attribs, uniforms );
            canvas.programs[ program.name ] = program;
        }

        gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
        updateDistanceFieldUniforms.call( canvas, canvas.programs[ 'update_sdf' ] );

        gl.enableVertexAttribArray( canvas.programs[ 'raytrace' ].position );
        gl.enableVertexAttribArray( canvas.programs[ 'raytrace' ].texCoord );
        //updateRaytraceUniforms( programs[ 'raytrace' ] );
        renderOnce.call( canvas );
    } );
}

function updateDistanceFieldUniforms( program ) {
    let gl = this.context;

    gl.useProgram( program );
    //gl.uniform2f( program.tiles, slices.x, slices.y );
    gl.uniform1f( program.numLayers, depth );
    gl.uniform3f( program.seedOrigin, seedOrigin.x, seedOrigin.y, seedOrigin.z );
    gl.uniform1f( program.targetIntensity, targetIntensity );
    gl.uniform1f( program.alpha, alpha );
    gl.uniform1f( program.sensitivity, sensitivity );
    gl.uniform3f( program.volumeDimensions, width, height, depth );
}

function renderOnce() {
    if( $.isEmptyObject( this.programs ) ) return;

    console.log( 'initializing...' );
    iteration = 0;

    if( targetIntensity == -1. ) {
        getSeedValue.call( this );
    }

    updateDistanceFieldUniforms.call( this, this.programs[ 'update_sdf' ] );
    //transfer the volume from the two tiled texture into the volume 3D texture
    initializeVolume.call( this, this.programs[ 'initialize_volume' ], this.volumeFrameBuffer, this.tiledVolume );

    //initialize the SDF - render initial SDF to FBO
    initializeDistanceField.call( this, this.programs[ 'initialize_sdf' ], this.frameBuffers[ 0 ], seedOrigin, seedRadius );

    update.call( this );
}

let backfacing = true;
let iteration = 0;
let MAX_ITERATION = 500;

/*function animate() {
    stats.begin();

    if( updating ) nextIteration();
    render();

    stats.end();
    requestAnimationFrame( animate );
}*/


function nextIteration() {

  /*  let delta = ( Date.now() - lastCalledTime ) / 1000;

    if( delta < 0.01 ) return;

    lastCalledTime = Date.now();

    this.busy = true;*/

    if( iteration < MAX_ITERATION ) {
        iteration++;
        $( '#log' ).html( 'iteration ' + iteration );
        console.log( 'iteration ' + iteration );
    }
}

function update() {
    if( $.isEmptyObject( this.programs ) ) return;

    updateDistanceField.call( this, this.programs[ 'update_sdf' ], this.volumeFrameBuffer, this.frameBuffers[ iteration % 2 ], this.frameBuffers[ ( iteration + 1 ) % 2 ] );
    render.call( this );
}

function render() {
    if( $.isEmptyObject( this.programs ) ) return;

    //render backface
    renderBackface.call( this, this.programs[ 'backfaces' ], this.backfaceFrameBuffer );
    //raytrace volume
    renderRaytrace.call( this, this.programs[ 'raytrace' ], this.volumeFrameBuffer, this.frameBuffers[ iteration % 2 ], this.backfaceFrameBuffer );

    //render a texture to fullscreen (for debug purposes)
    //renderTextureToViewport.call( this, this.programs[ 'debug_texture' ], this.frameBuffers[ iteration % 2 ].texture );
    //renderTextureToViewport.call( this, this.programs[ 'debug_texture' ], this.backfaceFrameBuffer.texture );

    /*
     //debug: write gl2Canvas to download folder
     let image = gl2Canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");  // here is the most important part because if you dont replace you will get a DOM 18 exception.
     window.location.href = image;

     */
}

// RENDER FUNCTIONS

//transfer volume from tiled 2D format into 3D texture
function initializeVolume ( program, volumeFrameBuffer, tiledTexture ) {
    let gl = this.context;

    gl.useProgram( program );

    gl.uniform2f( program.tiles, slices.x, slices.y );

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, tiledTexture );
    gl.uniform1i( program.tiledTexture, 0 );

    renderTo3DTexture.call( this, program, volumeFrameBuffer, depth );
}

//initialize distance field from seed
function initializeDistanceField( program, frameBuffer, seedOrigin, seedRadius ) {
    let gl = this.context;

    gl.useProgram( program );

    //todo: this shouldn't be here
    gl.uniform2f( program.tiles, tiles.x, tiles.y );

    gl.uniform1f( program.numLayers, depth );
    gl.uniform3f( program.seedOrigin, seedOrigin.x, seedOrigin.y, seedOrigin.z );
    gl.uniform3f( program.volumeDimensions, width, height, depth );
    gl.uniform1f( program.seedRadius, seedRadius * width );

    renderTo3DTexture.call( this, program, frameBuffer, depth );
}

//update distance field by looking up values from one texture and updating it into other
function updateDistanceField( program, volumeFrameBuffer, sourceFrameBuffer, targetFrameBuffer ) {
    let gl = this.context;

    gl.useProgram( program );

    //todo: this shouldn't be here
    gl.uniform2f( program.tiles, tiles.x, tiles.y );

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( volumeFrameBuffer.type, volumeFrameBuffer.texture );
    gl.uniform1i( program.volumeTexture, 0 );

    gl.activeTexture( gl.TEXTURE1 );
    gl.bindTexture( sourceFrameBuffer.type, sourceFrameBuffer.texture ); //fbo texture to read from
    gl.uniform1i( program.distanceFieldTexture, 1 );

    renderTo3DTexture.call( this, program, targetFrameBuffer, depth );
}

//render texture into screen / for debugging
function renderTextureToViewport( program, texture ) {
    let gl = this.context;

    gl.viewport( 0, 0, this.width, this.height );
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    gl.useProgram( program );

    //todo: this shouldn't be here
    gl.uniform2f( program.tiles, tiles.x, tiles.y );

    gl.activeTexture( gl.TEXTURE0 );
    //gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.uniform1i( program.tex, 0 );

    renderQuad.call( this, program );

    gl.bindTexture( gl.TEXTURE_2D, null );
}

//render backface of cube
function renderBackface( program, frameBuffer ) {
    let gl = this.context;

    gl.enable( gl.CULL_FACE );
    gl.enable( gl.DEPTH_TEST );

    gl.cullFace( gl.FRONT );

    gl.bindFramebuffer( gl.FRAMEBUFFER, frameBuffer.buffer ); //render to framebuffer, not screen

    gl.viewport( 0, 0, this.width, this.height );

    gl.useProgram( program );

    //todo: this shouldn't be here
    gl.uniform2f( program.tiles, tiles.x, tiles.y );
    //todo: this shouldn't be here
    gl.uniform2f( program.tiles, tiles.x, tiles.y );
    gl.uniformMatrix4fv( program.projectionMatrix, false, camera.projectionMatrix );
    gl.uniformMatrix4fv( program.modelViewMatrix, false, camera.modelViewMatrix );

    renderCube.call( this, program );

    gl.bindFramebuffer( gl.FRAMEBUFFER, null );

    gl.disable( gl.CULL_FACE );
    gl.disable( gl.DEPTH_TEST );
}

//do raytracing of cube
function renderRaytrace( program, volumeFrameBuffer, distanceFieldFrameBuffer, backfaceFrameBuffer ) {
    let gl = this.context;

    gl.viewport( 0, 0, this.width, this.height );

    gl.useProgram( program );

    //todo: this shouldn't be here
    gl.uniform2f( program.tiles, tiles.x, tiles.y );
    gl.uniform3f( program.volumeDimensions, width, height, depth );

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( backfaceFrameBuffer.type, backfaceFrameBuffer.texture );
    gl.uniform1i( program.backfaceTexture, 0 );

    gl.activeTexture( gl.TEXTURE1 );
    gl.bindTexture( volumeFrameBuffer.type, volumeFrameBuffer.texture );
    gl.uniform1i( program.volumeTexture, 1 );

    gl.activeTexture( gl.TEXTURE2 );
    gl.bindTexture( distanceFieldFrameBuffer.type, distanceFieldFrameBuffer.texture );
    gl.uniform1i( program.distanceFieldTexture, 2 );

    gl.uniformMatrix4fv( program.projectionMatrix, false, camera.projectionMatrix );
    gl.uniformMatrix4fv( program.modelViewMatrix, false, camera.modelViewMatrix );
    gl.uniformMatrix4fv( program.modelMatrix, false, camera.modelMatrix );

    renderCube.call( this, program );
}

/*
function updateRaytraceUniforms( program ) {
    gl.useProgram( program );
    //gl.uniform1f( program.iGlobalTime, ( Date.now() - start ) / 1000.0 );
    gl.uniform1f( program.seedRadius, seedRadius );
    gl.uniform2f( program.resolution, gl2Canvas.width, gl2Canvas.height );
    gl.uniform2f( program.tiles, slices.x, slices.y );
    gl.uniform3f( program.volumeDimensions, width, height, slices.x * slices.y );
    gl.uniform3f( program.seedOrigin, seedOrigin[ 0 ], seedOrigin[ 1 ], seedOrigin[ 2 ] );
}*/



//Render a 3D box using current program
function renderCube( program ) {
    let gl = this.context;

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    gl.enable( gl.DEPTH_TEST );

    gl.bindBuffer( gl.ARRAY_BUFFER, this.position3DBuffer );
    gl.vertexAttribPointer( program.position, 3, gl.FLOAT, false, 0, 0 );

    gl.bindBuffer( gl.ARRAY_BUFFER, this.texCoord3DBuffer );
    gl.vertexAttribPointer( program.texCoord, 3, gl.FLOAT, false, 0, 0 );

    gl.drawArrays( gl.TRIANGLES, 0, 36 );

    gl.disable( gl.DEPTH_TEST );

    gl.bindBuffer( gl.ARRAY_BUFFER, null );
}

//Render a 2D quad using current program
function renderQuad( program ) {
    let gl = this.context;

    //gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    gl.bindBuffer( gl.ARRAY_BUFFER, this.position2DBuffer );
    gl.vertexAttribPointer( program.position, 2, gl.FLOAT, false, 0, 0 );

    gl.bindBuffer( gl.ARRAY_BUFFER, this.texCoord2DBuffer );
    gl.vertexAttribPointer( program.texCoord, 2, gl.FLOAT, false, 0, 0 );

    gl.drawArrays( gl.TRIANGLES, 0, 6 );
    gl.bindBuffer( gl.ARRAY_BUFFER, null );
}

//Render a 2D quad to all layers of 3D texture using current program
function renderTo3DTexture( program, framebuffer, depth ) {
    let gl = this.context;

    gl.bindFramebuffer( gl.FRAMEBUFFER, framebuffer.buffer );
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    let tile_width = framebuffer.width / tiles.x;
    let tile_height = framebuffer.height / tiles.y;

    for( let layer = 0; layer < depth; layer++ ) {
        gl.uniform1f( program.layer, layer );

        if( gl.type === 'webgl2') {
            gl.viewport( 0, 0, width, height );
            //set texture layer for webgl 2.0
            gl.framebufferTextureLayer( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, framebuffer.texture, 0, layer );
        } else {
            //fallback solution for webgl 1.0
            let offset_x = tile_width * ( layer % tiles.x );
            let offset_y = tile_height * Math.floor( layer / tiles.x );

            //gl.scissor( offset_x, offset_y, tile_width, tile_height );
            gl.viewport( offset_x, offset_y, tile_width, tile_height );
        }

        renderQuad.call( this, program );
    }

    gl.bindFramebuffer( gl.FRAMEBUFFER, null );
}
