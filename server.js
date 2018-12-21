const path = require('path');
const express = require('express');
const app = express();
const socketio = require('socket.io');

// app.listen() returns an http.Server object
const server = app.listen(1337, () => {
  console.log(`Listening on http://localhost:${server.address().port}`)
});

const io = socketio(server);

const gameState = {
  players: {},
  obstacles:[],
  highScoreList: []
}

io.on('connection', socket => {
  console.log('A new client has connected!')
  console.log(socket.id)

  gameState.players[socket.id] = {
    playerId: socket.id,
    playerName: 'Anonymous',
    x: 100,
    y: 245
  }

  socket.emit('currentPlayers', gameState.players);

  socket.broadcast.emit('newPlayer', gameState.players[socket.id]);

  if (gameState.players.length) socket.emit('load', gameState);

  socket.on('handlePlayerMovement', function (x, y, angle, distToWorldLeftBound, obstacleNum) {
    gameState.players[socket.id].x = x;
    gameState.players[socket.id].y = y;
    gameState.players[socket.id].angle = angle;
    gameState.players[socket.id].distToWorldLeftBound = distToWorldLeftBound;
    gameState.players[socket.id].obstacleNum = obstacleNum;
    socket.broadcast.emit('playerHasMoved', gameState.players[socket.id]);
  });

  socket.on('playerNameSet', function (playerName) {
    gameState.players[socket.id].playerName = playerName;
  });

  socket.on('updateHighScoreList', function (score) {
    let playerName = gameState.players[socket.id].playerName;
    gameState.highScoreList.push({playerName, score});
    let compareScores = function(scoreObj1, scoreObj2) {
      if(scoreObj1.score < scoreObj2.score) {
        return 1;
      } else {
        return -1;
      }
    }
    gameState.highScoreList.sort(compareScores);
    if (gameState.highScoreList.length > 10) {
      gameState.highScoreList = gameState.highScoreList.splice(0, 11);
    }
    socket.emit('updatedHighScoreList', gameState.highScoreList);
  });

  socket.on('disconnect', () => {
    delete gameState.players[socket.id]
    io.emit('disconnect', socket.id)
    console.log('Goodbye, ', socket.id, ' :(')
  });
});

app.use(express.static(path.join(__dirname, 'public')));
