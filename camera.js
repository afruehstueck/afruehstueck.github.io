function Camera() {
    this.rotate = [ 0.0, 0.0, 0.0, 1.0 ];		// rotation quat
    this.translate = [ 0.0, 0.0, -7.0 ];		// translation vector
    this.zoom = 0.0;

    this.zNear = 0.5;
    this.zFar = 100.0;
    this.panSpeed = 20.0;
    this.zoomSpeed = 1.0;

    // flags
    this.bRotate = false;
    this.bTranslate = false;
    this.bPan = false;

    this.vLast = [ 0.0, 0.0, 0.0 ];
    this.vCurr = [ 0.0, 0.0, 0.0 ];

    // arcball params
    this.width	  = 0.0;
    this.height   = 0.0;
    this.radius   = 1.0;
    // matrices
    this.projectionMatrix = mat4.create();
    this.modelViewMatrix = mat4.create();
}

Camera.prototype.start = function( x, y ) {
    this.vLast = this.screenToVector( x, y );
};

// flags: zoom, rotate, pan
// to do: add zoom, pan
Camera.prototype.update = function( x, y ) {
    if ( this.bRotate ) {
        // compute quaternion representing rotation from vLast to vCurr
        var u = vec3.normalize( this.vLast );
        this.vCurr = this.screenToVector( x, y );
        var v = vec3.normalize( this.vCurr );

        var w = vec3.cross( u, v, w );
        var a = 1 + vec3.dot( u, v );

        var quatUpdate = [ w[ 0 ], w[ 1 ], w[ 2 ], a ];
        this.rotate = quat4.normalize( quat4.multiply( quatUpdate, this.rotate, this.rotate ) );
    }
    mat4.perspective( 30, this.width / this.height, 0.1, 100.0, this.projectionMatrix );
    mat4.identity( this.modelViewMatrix );
    mat4.translate( this.modelViewMatrix, this.translate );
    mat4.multiply( this.modelViewMatrix, mat4.inverse( quat4.toMat4( this.rotate) ) );

    this.vLast = this.vCurr;
};

Camera.prototype.screenToVector = function( x, y ) {
    var result 	= [];

    result[ 0 ]	= ( x - this.width / 2.0 ) / ( this.radius * this.width / 2.0 );
    result[ 1 ]	= -( y - this.height / 2.0 ) / ( this.radius * this.width / 2.0 );
    result[ 2 ]	= 0;

    var len2 = result[ 0 ] * result[ 0 ] + result[ 1 ] * result[ 1 ];

    if ( len2 <= 1.0 )
        result[ 2 ] = Math.sqrt( 1.0 - len2 );
    else
        result = vec3.normalize( result ); // nearest point
    return result;
};