var config = {
  apiKey: "AIzaSyDvfrhpqEanobbT4BI6stROYuFCmZ7NzAQ",
  authDomain: "rps-multiplayer-470bc.firebaseapp.com",
  databaseURL: "https://rps-multiplayer-470bc.firebaseio.com",
  projectId: "rps-multiplayer-470bc",
  storageBucket: "rps-multiplayer-470bc.appspot.com",
  messagingSenderId: "621428962057"
};
firebase.initializeApp(config);
var database = firebase.database();
var intervalId;

$(document).ready(function() {
  game.initiate();
});

var game = {
  initiate: function() {;
    this.findActive();

    clicks.addPlayer('p1', 'Cid');
    clicks.addPlayer('p2', 'Cloud');
    clicks.choice('p1', 'rock', 'Cid');
    clicks.choice('p1', 'paper', 'Cid');
    clicks.choice('p1', 'sciss', 'Cid');
    clicks.choice('p2', 'rock', 'Tifa');
    clicks.choice('p2', 'paper', 'Tifa');
    clicks.choice('p2', 'sciss', 'Tifa');
    clicks.showDown('p1');
    clicks.showDown('p2');
  },
  findActive: function() {
    let activeId = "";
    database.ref('games/').once('value').then(function(snapshot) {
      let active = "";
      snapshot.forEach(function(child) {
        if (child.val().active) {
          active = child.val().id;
        }
      });
      return active;
    }).then(function(id){ 
      let init = id;
      if (init === "") init = game.create();
      $('.arena').attr('data-gameId', init);
    });
  },
  create: function() {
    let key = database.ref('games/').push().key;
    database.ref('games/'+key).set({ 
      id: key,
      active: true,
      p1User: "",
      p2User: "",
      p1Ready: false,
      p2Ready: false,
      p1RPS: -1,
      p2RPS: -1,
      p1Hist: [0,0,0],
      p2Hist: [0,0,0],
      chat: [],
      timer: -1,
      showdown: false,
      dateAdded: firebase.database.ServerValue.TIMESTAMP
    });
    console.log("create "+key);
    return key;
  },
  startMonitor: function() {
    database.ref('/games/' + $('.arena').data('gameid') + '/')
            .on('value', function(snapshot){

      sv = snapshot.val();
      if (sv.showdown && sv.timer<=0) {
        if (sv.p1RPS===-1 || sv.p2RPS===-1) {
          if (sv.p1RPS===-1 && sv.p2RPS===-1) {
            game.updateHistory(-1, sv.p1Hist, sv.p2Hist);
          }
          else if (sv.p1RPS!==-1) {
            game.updateHistory(1, sv.p1Hist, sv.p2Hist);
          }
          else {
            game.updateHistory(2, sv.p1Hist, sv.p2Hist);
          }
        }
        else {
          let checkP1Win = sv.p1RPS - sv.p2RPS;
          if (checkP1Win === 0) {
            game.updateHistory(0, sv.p1Hist, sv.p2Hist);
          } else if (checkP1Win === 1 || checkP1Win === -2) {
            game.updateHistory(1, sv.p1Hist, sv.p2Hist);
          } else {
            game.updateHistory(2, sv.p1Hist, sv.p2Hist);
          }
        }
      }

      if (sv.p1Ready && sv.p2Ready) {
        timer.start(10);
      }
    });
  },
  updateHistory: function(num, p1Hist, p2Hist) {
    switch (num) {
      case 0: $('#result').html("<p>Tie!!</p>"); 
              p1Hist[num]++; p2Hist[num]++; 
              break;
      case 1: $('#result').html("<p>Player 1 Wins!!</p>"); 
              p1Hist[num]++; p2Hist[num+1]++; 
              break;
      case 2: $('#result').html("<p>Player 2 Wins!!</p>"); 
              p1Hist[num]++; p2Hist[num-1]++; 
              break;
      default: $('#result').html("<p>No one is playing...</p>");
               break;
    }
    let storeData = {
      p1RPS: -1,
      p2RPS: -1,
      p1Hist: p1Hist,
      p2Hist: p2Hist,
      p1Ready: false,
      p2Ready: false,
      timer: -1,
      showdown: false
    }
    database.ref('/games/' + $('.arena').data('gameid') + '/')
                              .update(storeData);
  }
}

var clicks = {
  addPlayer: function(player, userId) {
    $('#'+player+'-add').on('click', function() {
      $('#'+player).attr('data-user', userId);

      var playerExists = false;
      //look to see if user exists in db
      database.ref('users/').once("value").then(function(snapshot) {
        snapshot.forEach(function(child) {
          cv = child.val();
          if (cv.userId === userId) playerExists = true;
        });
      });

      if (!playerExists) {
        database.ref('users/' + userId).set({ 
          userId: userId,
          history: [0,0,0],
          dateAdded: firebase.database.ServerValue.TIMESTAMP
        });
      }

      //update player name
      player === "p1" ? database.ref('/games/' + $('.arena').data('gameid') + '/')
                              .update({p1User: userId}) :
                        database.ref('/games/' + $('.arena').data('gameid') + '/')
                              .update({p2User: userId});
    });

  },
  showDown: function(player) {
    $('#'+player+'-showdown').on('click', function() {
      player === "p1" ? database.ref('/games/' + $('.arena').data('gameid') + '/')
                              .update({p1Ready: true}) :
                        database.ref('/games/' + $('.arena').data('gameid') + '/')
                              .update({p2Ready: true});
      game.startMonitor();
    });
  },
  choice: function(player, choice) {
    let choiceNum;
    switch(choice) {
      case "rock": choiceNum = 0; break;
      case "paper": choiceNum = 1; break;
      case "sciss": choiceNum = 2; break;
      default: choiceNum = -1; break;
    }
    $('#'+player+'-'+choice).on('click', function() {
      player === "p1" ? database.ref('/games/' + $('.arena').data('gameid') + '/')
                              .update({p1RPS: choiceNum}) :
                        database.ref('/games/' + $('.arena').data('gameid') + '/')
                              .update({p2RPS: choiceNum});
    });
  }
}

var timer = {
  start: function(sec) {
    database.ref('/games/' + $('.arena').data('gameid') + '/')
                              .update({p1Ready: false, p2Ready: false, 
                                       timer: sec, showdown: true});

    $('#result').empty();
    $('#timer').html(sec);
    $('.arena').attr('count', "0");

    if (intervalId) {
      clearInterval(intervalId);
    }
    intervalId = setInterval(function() {
      let count = parseInt($('.arena').attr('count'));
      count++;
      console.log(count);
      $('.arena').attr('count', count);

      let timer = sec - count;
      database.ref('/games/' + $('.arena').data('gameid') + '/').update({timer: timer});
      $('#timer').html(timer);

      if (timer <= 0) {
        clearInterval(intervalId);
      }
    }, 1000);
  }
}

var db = {
  deleteInactive: function() {

  }
}