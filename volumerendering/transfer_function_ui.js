function updateTransferFunction() {
	let img = document.getElementById( 'transferColor' );
	let tfCanvas = document.createElement( 'canvas' );
	tfCanvas.height = img.height;
	tfCanvas.width = img.width;

	let ctx = tfCanvas.getContext( '2d' );

	let gradient = ctx.createLinearGradient( 0, 0, tfCanvas.width, tfCanvas.height );
	gradient.addColorStop( controls.stepPos1, controls.color1 );
	gradient.addColorStop( controls.stepPos2, controls.color2 );
	gradient.addColorStop( controls.stepPos3, controls.color3 );

	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, tfCanvas.width, tfCanvas.height );

	img.src = tfCanvas.toDataURL();

	//clear canvas
	ctx.clearRect( 0, 0, tfCanvas.width, tfCanvas.height );

	drawCheckeredBackground( tfCanvas );
	let alphaBackground = document.getElementById( 'transferBackground' );
	alphaBackground.src = tfCanvas.toDataURL();

	//clear canvas
	ctx.clearRect( 0, 0, tfCanvas.width, tfCanvas.height );

	gradient = ctx.createLinearGradient( 0, 0, tfCanvas.width , tfCanvas.height );
	gradient.addColorStop( controls.stepPos1, 'rgba( 255, 255, 255, ' + controls.alpha1 + ')' );
	gradient.addColorStop( controls.stepPos2, 'rgba( 255, 255, 255, ' + controls.alpha2 + ')' );
	gradient.addColorStop( controls.stepPos3, 'rgba( 255, 255, 255, ' + controls.alpha3 + ')' );

	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, tfCanvas.width - 1, tfCanvas.height - 1 );

	let imgAlpha = document.getElementById( 'transferAlpha' );
	imgAlpha.src = tfCanvas.toDataURL();

	//from http://stackoverflow.com/a/27667424
	function drawCheckeredBackground( canvas, rows, columns ) {
		let ctx = canvas.getContext( '2d' );

		ctx.fillStyle = '#222222';
		ctx.fillRect( 0, 0, canvas.width, canvas.height );

		let w = canvas.width;
		let h = canvas.height;

		rows = h / 5;
		columns = w / 5;

		w /= columns; // width of a block
		h /= rows;    // height of a block
		ctx.fillStyle = '#050505';

		for (let i = 0; i < rows; ++i) {
			for ( let j = 0, col = columns / 2; j < col; ++j ) {
				ctx.rect( 2 * j * w + (i % 2 ? 0 : w), i * h, w, h );
			}
		}
		ctx.fill();
	}

	updateTF = true;
}