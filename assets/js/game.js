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
var whoAmI = "";

$(document).ready(function() {
  game.initiate();
});

var game = {
  initiate: function() {;
    clicks.addPlayer();
  },
  findActive: function(userId) {
    database.ref('games/').once('value').then(function(snapshot) {
      let active = "";
      snapshot.forEach(function(child) {
        if (!child.val().active) {
          active = child.val().id;
        }
      });
      return active;
    }).then(function(id){ 
      let init = id;
      init === "" ? init = game.create(userId) : game.join(userId, init);
      $('.arena').attr('data-gameId', init);
    });
  },
  create: function(userId) {
    let key = database.ref('games/').push().key;
    database.ref('games/'+key).set({ 
      id: key,
      active: false,
      p1User: userId,
      p2User: "",
      p1Ready: false,
      p2Ready: false,
      p1RPS: -1,
      p2RPS: -1,
      p1Hist: [0,0,0],
      p2Hist: [0,0,0],
      timer: -1,
      showdown: false,
      dateAdded: firebase.database.ServerValue.TIMESTAMP
    });
    $('#p1').attr('data-userId', userId);
    $('#p1-header').html(userId);
    game.startMonitor(key);
    display.showdownBtn('p1');
    whoAmI = 'p1';
    database.ref('/games/' + key + '/chat/').push({
      message: userId + " entered game.",
      dateAdded: firebase.database.ServerValue.TIMESTAMP
    }); 
    chat.display(key);
    return key;
  },
  join: function(userId, gameId) {
    database.ref('/games/' + gameId + '/').update({p2User: userId});
    $('#p2').attr('data-userId', userId);
    $('#p2-header').html(userId);
    db.updateActive(gameId);
    game.startMonitor(gameId);
    display.showdownBtn('p2');
    whoAmI = 'p2';
    database.ref('/games/' + gameId + '/chat/').push({
      message: userId + " entered game.",
      dateAdded: firebase.database.ServerValue.TIMESTAMP
    }); 
    chat.display(gameId);
  },
  startMonitor: function(gameId) {
    database.ref('/games/' + gameId + '/').on('value', function(snapshot) {
      sv = snapshot.val();

      if (sv.p1User!=="") $('#p1-header').html(sv.p1User);
      if (sv.p2User!=="") $('#p2-header').html(sv.p2User);

      if (sv.showdown && sv.timer<=0) {
        if (sv.p1RPS===-1 || sv.p2RPS===-1) {
          if (sv.p1RPS===-1 && sv.p2RPS===-1) {
            db.updateHistory(-1, sv.p1Hist, sv.p2Hist, sv.p1User, sv.p2User, sv.p1RPS, sv.p2RPS);
          }
          else if (sv.p1RPS!==-1) {
            db.updateHistory(1, sv.p1Hist, sv.p2Hist, sv.p1User, sv.p2User, sv.p1RPS, sv.p2RPS);
          }
          else {
            db.updateHistory(2, sv.p1Hist, sv.p2Hist, sv.p1User, sv.p2User, sv.p1RPS, sv.p2RPS);
          }
        }
        else {
          let checkP1Win = sv.p1RPS - sv.p2RPS;
          if (checkP1Win === 0) {
            db.updateHistory(0, sv.p1Hist, sv.p2Hist, sv.p1User, sv.p2User, sv.p1RPS, sv.p2RPS);
          } else if (checkP1Win === 1 || checkP1Win === -2) {
            db.updateHistory(1, sv.p1Hist, sv.p2Hist, sv.p1User, sv.p2User, sv.p1RPS, sv.p2RPS);
          } else {
            db.updateHistory(2, sv.p1Hist, sv.p2Hist, sv.p1User, sv.p2User, sv.p1RPS, sv.p2RPS);
          }
        }
      }

      if (sv.p1Ready && sv.p2Ready) {
        timer.start(10);
      }
      //trigger autoscroll on both clients
      $(".log").stop().animate({ scrollTop: $(".log")[0].scrollHeight}, 1000);
    });
  }
}

var clicks = {
  addPlayer: function() {
    $('#join-game').on('click', function() {
      if ($('#input-user').val()!=="") {
        let userId = $('#input-user').val();
        //look to see if user exists in db
        database.ref('users/').once("value").then(function(snapshot) {
          let playerExists = false;
          snapshot.forEach(function(child) {
            cv = child.val();
            if (cv.userId === userId) playerExists = true; 
          });
          return playerExists;
        }).then(function(playerExists){
          if (!playerExists) {
            database.ref('users/' + userId).set({ 
              userId: userId,
              history: [0,0,0],
              dateAdded: firebase.database.ServerValue.TIMESTAMP
            });
          }
        });
        game.findActive(userId);
        display.arena();
        chat.handleClick();
        chat.handleEnter();
      }
    });
  },
  showDown: function(player) {
    $('#'+player+'-showdown').on('click', function() {
      display.rpsBtns(player);
      player === "p1" ? database.ref('/games/' + $('.arena').data('gameid') + '/')
                              .update({p1Ready: true}) :
                        database.ref('/games/' + $('.arena').data('gameid') + '/')
                              .update({p2Ready: true});
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
      display.activeChoice(player, choice);
    });
  }
}

var display = {
  rpsBtns: function(player) {
    let rock = $('<button>').addClass('rock-btn');
    rock.attr('id', player+'-rock').text('ROCK');
    let paper = $('<button>').addClass('paper-btn');
    paper.attr('id', player+'-paper').text('PAPER');
    let sciss = $('<button>').addClass('sciss-btn');
    sciss.attr('id', player+'-sciss').text('SCISSORS');
    $('#'+player+'-btn-box').html(rock).append(paper).append(sciss);
    clicks.choice(player, 'rock');
    clicks.choice(player, 'paper');
    clicks.choice(player, 'sciss');
  },
  showdownBtn: function(player) {
    let btn = $('<button>').addClass('showdown-btn');
    btn.attr('id', player+'-showdown').text('SHOWDOWN');
    $('#'+player+'-btn-box').html(btn);
    clicks.showDown(player);
  },
  activeChoice: function(player, choice) {
    switch (choice) {
      case 'rock': $('#'+player+'-rock').addClass('active-rps');
                   $('#'+player+'-paper').removeClass('active-rps');
                   $('#'+player+'-sciss').removeClass('active-rps');
                   break;
      case 'paper': $('#'+player+'-rock').removeClass('active-rps');
                   $('#'+player+'-paper').addClass('active-rps');
                   $('#'+player+'-sciss').removeClass('active-rps');
                   break;
      case 'sciss': $('#'+player+'-rock').removeClass('active-rps');
                   $('#'+player+'-paper').removeClass('active-rps');
                   $('#'+player+'-sciss').addClass('active-rps');
                   break;
    }
  },
  arena: function() {
    let timerDiv = $('<div>').addClass('timer');
    let timerSpan = $('<span>').attr('id', 'timer');
    timerDiv.html("Timer: ").append(timerSpan);

    let resultDiv = $('<div>').addClass('result');
    let resultSpan = $('<span>').attr('id', 'result');
    resultDiv.html("Result: ").append(resultSpan);

    $('.arena').html(timerDiv).append(resultDiv);
  },
  results: function(p1, p2, p1Choice, p2Choice) {
    let p1Throw, p2Throw;
    if (p1Choice === 0) {
      p1Throw = "<p>" + p1 + "threw rock.</p>";
    } else if (p1Choice === 1) {
      p1Throw = "<p>" + p1 + " threw paper.</p>";
    } else if (p1Choice === 2) {
      p1Throw = "<p>" + p1 + " threw scissors.</p>";
    } else {
      p1Throw = "<p>" + p1 + " was too slow...</p>";
    }

    if (p2Choice === 0) {
      p2Throw = "<p>" + p2+ "threw rock.</p>";
    } else if (p2Choice === 1) {
      p2Throw = "<p>" + p2 + " threw paper.</p>";
    } else if (p2Choice === 2) {
      p2Throw = "<p>" + p2 + " threw scissors.</p>";
    } else {
      p2Throw = "<p>" + p2 + " was too slow...</p>";
    }

    $('#result').html(p1Throw).append(p2Throw);
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

    if (intervalId) clearInterval(intervalId);
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
        display.showdownBtn(whoAmI);
      }
    }, 1000);
  }
}

var db = {
  deleteInactive: function() {

  },
  updateHistory: function(num, p1Hist, p2Hist, p1, p2, p1Choice, p2Choice) {
    display.results(p1, p2, p1Choice, p2Choice);

    switch (num) {
      case 0: $('#result').append("<p>You tied!</p>");
              p1Hist[num]++; p2Hist[num]++; break;
      case 1: $('#result').append("<p>" + p1 + " won!</p>");
              p1Hist[num]++; p2Hist[num+1]++; break;
      case 2: $('#result').append("<p>" + p2 + " won!</p>");
              p1Hist[num]++; p2Hist[num-1]++; break;
      default: break;
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
  },
  updateActive: function(gameId) {
    database.ref('/games/' + gameId + '/').update({active: true});
  },
  updateSignOut: function() {

  },
  updateDisconnect: function() {

  }
}