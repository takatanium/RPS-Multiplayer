$('#t1').on('click', function() {
	let div = $('<div>').addClass('test-taunt-box');
	let img = $('<img>').addClass('test-taunt').attr('src', 'assets/img/rock-test.png');
	div.append(img);
	$('.container').append(div);

	setTimeout(function(){ div.remove() }, 1950);
});