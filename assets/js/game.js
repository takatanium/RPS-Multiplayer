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
  display.reset();
});


var game = {
  addPlayer: function() {
    if ($('#input-user').val().trim() !== "") {
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
      // display.arena();
      display.sun();
      chat.handleClick();
      chat.handleEnter();
    }
    else {
      $('#input-user').val('');
    }
  },
  findActive: function(userId) {
    database.ref('games/').once('value').then(function(snapshot) {
      let active = ["", "p1", ""];
      snapshot.forEach(function(child) {
        let cv = child.val();
        if (!cv.active) {
          if (cv.p1User!==userId && cv.p2User!==userId) {
            active[0] = cv.id;
            cv.p1User === "" ? active[1] = 'p1' : active[1] = 'p2';
            active[2] = cv.p2User;
          }
        }
      });
      return active;
    }).then(function(arr){ 
      let init = arr[0];
      init === "" ? init = game.create(userId) : game.join(userId, arr, init);
      $('.arena').attr('data-gameId', init);
    });
  },
  create: function(userId) {
    whoAmI = 'p1';

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
    // $('#p2-header').html("Waiting for Connection");
    db.onConnect(whoAmI, userId, key);

    return key;
  },
  join: function(userId, arr, gameId) {
    whoAmI = arr[1];

    if (whoAmI === 'p2') {
      database.ref('/games/' + gameId + '/').update({p2User: userId});
      db.updateActive(gameId, true);
    }
    else {
      database.ref('/games/' + gameId + '/').update({p1User: userId});
      arr[2] === "" ? db.updateActive(gameId, false) : db.updateActive(gameId, true);
    }

    db.onConnect(whoAmI, userId, gameId);
  },
  startMonitor: function(gameId) {
    database.ref('/games/' + gameId + '/').on('value', function(snapshot) {
      sv = snapshot.val();

      //Main gameplay monitor
      if (sv.p1User !== "" && sv.p2User !== "") {
        if (sv.showdown && sv.timer <= 0) {
          if (sv.p1RPS === -1 || sv.p2RPS === -1) {
            if (sv.p1RPS === -1 && sv.p2RPS === -1) {
              db.updateHistory(-1, sv.p1Hist, sv.p2Hist, sv.p1User, sv.p2User, sv.p1RPS, sv.p2RPS);
            }
            else if (sv.p1RPS !== -1) {
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
      }
      else {
        clearInterval(intervalId);
        db.updateShowDown(gameId, false);
      }

      if (whoAmI === 'p1') {
        display.currentStats('p1', sv.p1Hist);

        if (sv.p2User === ''){
          $('#p2-header').html("Waiting for Connection");
          $('#p1-btn-box').empty();
          $('#timer').empty();
          $('.result').empty();
        } 
        else {
          $('#p2-header').html(sv.p2User);
          display.currentStats('p2', sv.p2Hist);
          if (sv.timer === -1) display.showdownBtn('p1');

          if (sv.p1Ready) {
            $('#p1-btn-box').empty();
          }
        }
      } 
      else {
        display.currentStats('p2', sv.p2Hist);

        if (sv.p1User === ''){
          $('#p1-header').html("Waiting for Connection");
          $('#p2-btn-box').empty();
          $('#timer').empty();
          $('.result').empty();
        } 
        else {
          $('#p1-header').html(sv.p1User);
          display.currentStats('p1', sv.p1Hist);
          if (sv.timer === -1) display.showdownBtn('p2');

          if (sv.p2Ready) {
            $('#p2-btn-box').empty();
          }
        }
      }

      //both players accept duel
      if (sv.p1Ready && sv.p2Ready) { 
        timer.start(10);
        display.rpsBtns(whoAmI);
      }


      //trigger autoscroll on both clients
      $(".log").stop().animate({ scrollTop: $(".log")[0].scrollHeight}, 1000);
    });
  },
  startUserMonitor: function(player, userId) {
    database.ref('/users/' + userId + '/').on('value', function(snapshot) {
      sv = snapshot.val();
      display.allStats(player, sv.history);
    });
  }
}

var clicks = {
  showDown: function(player) {
    $('#'+player+'-showdown').on('click', function() {
      $('#'+player+'-btn-box').empty();
      timer.sunReset();
      chat.logDB($('#'+player).data('userid') + " will duel at high noon!", $('.arena').data('gameid'));
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
  reset: function() {
    whoAmI = "";
    $('.signout').empty();
    $('#p1-header').empty();
    $('#p2-header').empty();
    $('#p1-btn-box').empty();
    $('#p2-btn-box').empty();
    $('#p1-current-hist').empty();
    $('#p1-all-hist').empty();
    $('#p2-current-hist').empty();
    $('#p2-all-hist').empty();
    $('.log').empty();
    $('.arena').empty();
    $('.arena').removeAttr('data-gameId');
    $('#p1').removeAttr('data-userid');
    $('#p2').removeAttr('data-userid');
    //show login screen
    let input = $('<input>').addClass('input-user-field').attr({
      id: 'input-user',
      placeholder: 'Enter Name',
      autofocus: 'autofocus'
    }).appendTo('.arena');
    let btn = $('<button>').addClass('add-btn').attr('id', 'join-game');
    btn.text('JOIN GAME').appendTo('.arena');
    $('#join-game').on('click', function() { game.addPlayer();});
    $(document).keyup(function(e) {
      if (e.which == 13) {
        if (whoAmI==="") game.addPlayer();
      }
    });
    db.removeOrphaned();
  },
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
      p1Throw = "<p>" + p1 + " threw rock.</p>";
    } else if (p1Choice === 1) {
      p1Throw = "<p>" + p1 + " threw paper.</p>";
    } else if (p1Choice === 2) {
      p1Throw = "<p>" + p1 + " threw scissors.</p>";
    } else {
      p1Throw = "<p>" + p1 + " was too slow...</p>";
    }

    if (p2Choice === 0) {
      p2Throw = "<p>" + p2+ " threw rock.</p>";
    } else if (p2Choice === 1) {
      p2Throw = "<p>" + p2 + " threw paper.</p>";
    } else if (p2Choice === 2) {
      p2Throw = "<p>" + p2 + " threw scissors.</p>";
    } else {
      p2Throw = "<p>" + p2 + " was too slow...</p>";
    }

    let result = $('<div>').addClass('result').text("Result: ");
    result.append(p1Throw).append(p2Throw);

    $('.arena').append(result);
  },
  currentStats: function(player, pHist) {
    let gameHist = $('#' + player + '-current-hist');

    let cHistTitle = $('<p>').text("--- Current Game ---").addClass('center-text');
    let cHistWinsP = $('<p>').text("Wins: ");
    let cHistWins = $('<span>').attr('id', player+'-current-wins').text(pHist[1]);
    cHistWinsP.append(cHistWins);
    let cHistLossesP = $('<p>').text("Losses: ");
    let cHistLosses = $('<span>').attr('id', player+'-current-losses').text(pHist[2]);
    cHistLossesP.append(cHistLosses);
    let cHistTiesP = $('<p>').text("Ties: ");
    let cHistTies = $('<span>').attr('id', player+'-current-ties').text(pHist[0]);
    cHistTiesP.append(cHistTies);

    gameHist.html(cHistTitle).append(cHistWinsP)
            .append(cHistLossesP).append(cHistTiesP);
  },
  allStats: function(player, pHist) {
    let gameHist = $('#' + player + '-all-hist');

    let aHistTitle = $('<p>').text("--- All Time ---").addClass('center-text');
    let aHistWinsP = $('<p>').text("Wins: ");
    let aHistWins = $('<span>').attr('id', player+'-all-wins').text(pHist[1]);
    aHistWinsP.append(aHistWins);
    let aHistLossesP = $('<p>').text("Losses: ");
    let aHistLosses = $('<span>').attr('id', player+'-all-losses').text(pHist[2]);
    aHistLossesP.append(aHistLosses);
    let aHistTiesP = $('<p>').text("Ties: ");
    let aHistTies = $('<span>').attr('id', player+'-all-ties').text(pHist[0]);
    aHistTiesP.append(aHistTies);

    gameHist.html(aHistTitle).append(aHistWinsP)
            .append(aHistLossesP).append(aHistTiesP);
  }, 
  sun: function() {
    let div = $('<div>').addClass('sun');
    let img = $('<img>').attr('id', 'sun-icon');
    img.attr('src', 'assets/img/sun-test.png');
    let time = $('<div>').addClass('timer').attr('id', 'timer');

    div.append(img).append(time);

    $('.arena').html(div);
  },
  signout: function(player, userId, gameId) {
    let btn = $('<button>').addClass('sign-btn').text('Signout');
    $('#'+player+'-signout').append(btn);
    $('#'+player+'-signout').on('click', function() {
      location.reload();
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
    timer.sunAnimation(sec);

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
        database.ref('/games/' + $('.arena').data('gameid') + '/').update({timer: -1});
      }
    }, 1000);
  },
  sunAnimation: function(sec) {
    let time = sec * 1000;
    $('.sun').animate({
      top: "-=130px"
    }, time, "linear");
  },
  sunReset: function() {
    $('.result').remove();
    $('.sun').css('top', '+=130');
    $('.timer').empty();
  }
}

var db = {
  updateHistory: function(num, p1Hist, p2Hist, p1, p2, p1Choice, p2Choice) {
    display.results(p1, p2, p1Choice, p2Choice);

    switch (num) {
      case 0: $('#result').append("<p>You tied!</p>");
              p1Hist[num]++; p2Hist[num]++; 
              db.updateUserHistory(0, p1, p2);
              break;
      case 1: $('#result').append("<p>" + p1 + " won!</p>");
              p1Hist[num]++; p2Hist[num+1]++; 
              db.updateUserHistory(1, p1, p2);
              break;
      case 2: $('#result').append("<p>" + p2 + " won!</p>");
              db.updateUserHistory(2, p1, p2);
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
  updateUserHistory: function(state, p1, p2) {
    database.ref('users/' + $('#'+whoAmI).data('userid') + '/').once("value")
    .then(function(snapshot) {
      return snapshot.val().history;
    }).then(function(history){
      if (state===0) history[0]++;
      else if (state===1) whoAmI === 'p1' ? history[1]++ : history[2]++;
      else whoAmI === 'p1' ? history[2]++ : history[1]++;

      if (whoAmI === 'p1') {
        if (state===0) chat.logDB('You Tied!!', $('.arena').data('gameid'));
        else if (state===1) chat.logDB(p1 + ' Won!', $('.arena').data('gameid'));
        else chat.logDB(p2 + ' Won!', $('.arena').data('gameid'));
      }

      database.ref('users/' + $('#'+whoAmI).data('userid') + '/').update({history: history});
    });
  },
  updateActive: function(gameId, status) {
    database.ref('/games/' + gameId + '/').update({active: status});
  },
  updateShowDown: function(gameId, status) {
    database.ref('/games/' + gameId + '/').update({showdown: status});
  },
  onDisconnect: function(userId, gameId) {
    //delete userid from gameid
    database.ref('/games/' + gameId + '/chat/').onDisconnect().remove();
    database.ref('/games/' + gameId + '/').onDisconnect().update({
      active: false,
      p1Hist: [0,0,0],
      p2Hist: [0,0,0],
      p1RPS: -1,
      p2RPS: -1,
      timer: -1
    });
    database.ref('/games/' + gameId + '/chat/').push().onDisconnect().set({
      type: "log",
      message: "--- " + userId + " signed out ---",
      dateAdded: firebase.database.ServerValue.TIMESTAMP
    });

    if (whoAmI === "p2") {
      database.ref('/games/' + gameId + '/').onDisconnect().update({
        p2User: "",
      });
    }
    else {
      database.ref('/games/' + gameId + '/').onDisconnect().update({
        p1User: "",
      });
    }
  },
  onConnect: function(which, userId, gameId) {
    database.ref('/games/' + gameId + '/chat/').remove();

    $('#'+which).attr('data-userId', userId);
    $('#'+which+'-header').html(userId);
    game.startUserMonitor(which, userId);
    game.startMonitor(gameId);
    chat.logDB(userId+ " entered game", gameId);
    chat.display(gameId);
    display.signout(which, userId, gameId);
    db.onDisconnect(userId, gameId);
  },
  removeOrphaned: function() {
    //find all game instances where no player names exist
    database.ref('games/').once('value').then(function(snapshot) {
      snapshot.forEach(function(child) {
        let cv = child.val();
        if (cv.p1User === "" && cv.p2User === "") {
           database.ref('games/' + cv.id + '/').remove();
        }
      });
    });  
  }
}