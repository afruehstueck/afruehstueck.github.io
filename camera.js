'use strict';

//Arcball camera
//based on orbit-camera by mikolalysenko
//https://github.com/mikolalysenko/orbit-camera
//uses gl-matrix 2.2

function Camera( rotation, center, distance ) {
    this.rotation = rotation;
    this.center   = center;
    this.distance = distance;

    this.modelMatrix = mat4.create();
    this.viewMatrix = mat4.create();
    this.modelViewMatrix = mat4.create();
    this.projectionMatrix = mat4.create();
}

function createCamera( eye, target, up ) {
    eye     = eye     || [ 0, 0, -1 ];
    target  = target  || [ 0, 0,  0 ];
    up      = up      || [ 0, 1,  0 ];
    var camera = new Camera( quat.create(), vec3.create(), 1.0 );
    camera.lookAt( eye, target, up );
    return camera;
}

Camera.prototype.setAspectRatio = function( width, height ) {
    mat4.perspective( this.projectionMatrix, Math.PI / 4.0, width / height, 0.1, 100.0);
};

Camera.prototype.update = function() {
    var conjugate = mat4.create();
    quat.conjugate( conjugate, this.rotation );
    var translation = vec3.fromValues( 0.0, 0.0, -this.distance );

    var fromRotationTranslation = mat4.create();
    mat4.fromRotationTranslation( fromRotationTranslation, conjugate, translation );
    mat4.translate( this.viewMatrix, fromRotationTranslation, vec3.negate( vec3.create(), this.center ) );
    mat4.multiply( this.modelViewMatrix, this.modelMatrix, this.viewMatrix );
};

Camera.prototype.lookAt = function( eye, center, up ) {
    var result = mat4.create();
    mat4.lookAt( result, eye, center, up );
    mat3.fromMat4( result, result );
    quat.fromMat3( this.rotation, result );
    vec3.copy( this.center, center );
    this.distance = vec3.distance( eye, center );
};

Camera.prototype.pan = function( dpan ) {
    var d = this.distance;
    var transform = vec3.fromValues( -d * (dpan[ 0 ] || 0 ),
        d * (dpan[ 1 ] || 0 ),
        d * (dpan[ 2 ] || 0 ) );
    vec3.transformQuat( transform, transform, this.rotation );
    vec3.add( this.center, this.center, transform );
};

Camera.prototype.zoom = function( d ) {
    this.distance += d;
    if( this.distance < 0.0 ) {
        this.distance = 0.0;
    }
};

function quatFromVec( out, vec ) {
    var x = vec[ 0 ];
    var y = vec[ 1 ];
    var z = vec[ 2 ];
    var s = x * x + y * y;
    if(s > 1.0) {
        s = 1.0
    }
    out[ 0 ] = -vec[ 0 ];
    out[ 1 ] =  vec[ 1 ];
    out[ 2 ] =  vec[ 2 ] || Math.sqrt( 1.0 - s );
    out[ 3 ] =  0.0
}

Camera.prototype.rotate = function( current, previous ) {
    var quat1 = mat4.create();
    var quat2 = mat4.create();
    quatFromVec( quat1, current );
    quatFromVec( quat2, previous );
    quat.invert( quat2, quat2 );
    quat.multiply( quat1, quat1, quat2 );
    if( quat.length( quat1 ) < 1e-6 ) {
        return;
    }
    quat.multiply( this.rotation, this.rotation, quat1 );
    quat.normalize( this.rotation, this.rotation );
};