var Controls = function() {
    this.x = 0.5;
    this.y = 0.55;
    this.z = 0.45;
    this.radius = 0.15;
    this.volume = 'res/bonsai128x128x256.png';
};

var gui = new dat.GUI();
var default_values = new Controls();


var f_volume = gui.addFolder( 'Volume' );
var volume_select = f_volume.add( default_values, 'volume', { bonsai: 'res/bonsai128x128x256.png', head: 'res/head128x128x256.png', heart: 'res/heart128x128x256.png', torso: 'res/torso128x128x256.png' } );

function onVolumeChanged( value ) {
    volumePath = value;
    init();
};

volume_select.onFinishChange( onVolumeChanged );

var f_sdf = gui.addFolder( 'Distance Function' );

var f_seed = gui.addFolder( 'Seed' );
var seed_x = f_seed.add( default_values, 'x', 0, 1 );
var seed_y = f_seed.add( default_values, 'y', 0, 1 );
var seed_z = f_seed.add( default_values, 'z', 0, 1 );
var seed_radius = f_seed.add( default_values, 'radius', 0, 1 );

seed_x.onChange( function( value ) {
    iteration = 0;
    seedOrigin[ 0 ] = value;
});
seed_y.onChange( function( value ) {
    iteration = 0;
    seedOrigin[ 1 ] = value;
});
seed_z.onChange( function( value ) {
    iteration = 0;
    seedOrigin[ 2 ] = value;
});
seed_radius.onChange( function( value ) {
    iteration = 0;
    seedRadius = value;
});

function onSeedChanged( value ) {
    console.log( 'values changed' );
    renderOnce();
};

seed_x.onFinishChange( onSeedChanged );
seed_y.onFinishChange( onSeedChanged );
seed_z.onFinishChange( onSeedChanged );
seed_radius.onFinishChange( onSeedChanged )

