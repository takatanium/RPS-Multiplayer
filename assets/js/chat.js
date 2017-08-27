chat = {
	handleClick: function() {
		$('#send-btn').on('click', function() {chat.enterMessage();});
	},
	handleEnter: function() {
		$(document).keyup(function(e) {if (e.which == 13) chat.enterMessage();});
	},
	enterMessage: function() {
		if ($('#text-message').val()!=="") {
			chat.updateDB($('#text-message').val());
			$('#text-message').val("");
		}
		$(".log").stop().animate({ scrollTop: $(".log")[0].scrollHeight}, 1000);
	},
	updateDB: function(message) {
		database.ref('/games/' + $('.arena').data('gameid') + '/chat/').push({
			message: $('#'+whoAmI).data('userid') + ": " + message,
			dateAdded: firebase.database.ServerValue.TIMESTAMP
		});                   
	},
	display: function(gameId) {
		database.ref('/games/' + gameId + '/chat/')
		        .orderByChild("dateAdded").on("child_added", function(snapshot) {

		  let sv = snapshot.val();
		  let message = $('<p>').addClass('log-message').text(sv.message);
		  $('.log').append(message);
		});
	}
}