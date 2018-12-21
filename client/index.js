import io from 'socket.io-client';

import PIXI from 'phaser-ce/build/custom/pixi';
import p2 from 'phaser-ce/build/custom/p2';
import Phaser from 'phaser-ce/build/custom/phaser-split';

let mainState = {
  socket: null,
  lastTimeSend: 0,
  obstacleList: [],
  obstacleNum: 0,
  gameWidth: 800,
  gameHeight: 490,

  // Creates a sprite for the user and enables physics
  addPlayer: function (player) {
    this.bird = game.add.sprite(player.x, player.y, 'bird');
    this.bird.scale.setTo(.062, .07);
    game.physics.arcade.enable(this.bird);
    this.bird.body.gravity.y = 1000;
    this.bird.spaceDown = false;
    this.bird.isAlive = true;
    this.bird.bringToTop();
  },

  // Creates a sprite for another player and adds them to other player sprite group
  addOtherPlayers: function (player) {
    let otherPlayer = game.add.sprite(player.x, player.y, 'bird');
    otherPlayer.scale.setTo(.062, .07);
    otherPlayer.playerId = player.playerId;
    otherPlayer.alpha = 0.15;
    this.otherPlayers.add(otherPlayer);
  },

  // Prevents obstacles from moving after game over
  restartGame: function () {
    this.bird.isAlive = false;
    let obstaclesBottom = this.obstaclesBottom.children;
    let obstaclesTop = this.obstaclesTop.children;
    for(let i = 0; i < obstaclesBottom.length; i++) {
      obstaclesBottom[i].body.velocity.x = 0;
      obstaclesTop[i].body.velocity.x = 0;
    }
  },

  // Creates one set of top and bottom screen obstacles and defines physics variables
  addObstacle: function (obstacleNum) {
    let obstacleBottom = game.add.sprite(this.gameWidth, this.gameHeight - this.obstacleList[obstacleNum], 'obstacle');
    game.physics.arcade.enable(obstacleBottom);
    obstacleBottom.body.velocity.x = -200;
    obstacleBottom.checkWorldBounds = true;
    obstacleBottom.outOfBoundsKill = true;
    obstacleBottom.sendToBack();

    let obstacleTop = game.add.sprite(this.gameWidth, this.gameHeight - this.obstacleList[obstacleNum] - 700, 'obstacle');
    game.physics.arcade.enable(obstacleTop);
    obstacleTop.body.velocity.x = -200;
    obstacleTop.checkWorldBounds = true;
    obstacleTop.outOfBoundsKill = true;
    obstacleTop.sendToBack();

    return {obstacleBottom, obstacleTop};
  },

  // Creates a sprite representing the left bound of the world
  // This sprite is used for calculating the position of the player
  addWorldLeftBound: function () {
    this.worldLeftBound = game.add.sprite(0, this.gameHeight/2, 'worldBoundary');
    game.physics.arcade.enable(this.worldLeftBound);
    this.worldLeftBound.body.velocity.x = -200;
    this.worldLeftBound.checkWorldBounds = true;
    this.worldLeftBound.outOfBoundsKill = false;
  },

  // Creates a high score list element below the game canvas element
  displayHighScoreList: function(highScoreList) {
    let highScoreListElem = document.createElement("div");
    highScoreListElem.id = "high-score-list";
    if (highScoreList.length > 0) {
      for (let i = 0; i < highScoreList.length; i++) {
        let para = document.createElement("P");
        let textNode = document.createTextNode(highScoreList[i].playerName + ": " + highScoreList[i].score);
        para.appendChild(textNode);
        highScoreListElem.appendChild(para);
      }
    }
    document.getElementsByTagName("body")[0].appendChild(highScoreListElem);
  },

  // Preloads game sprites
  preload: function() { 
      game.load.image('bird', 'frame-1.png');
      game.load.image('bird2', 'frame-2.png');
      game.load.image('bird3', 'frame-3.png');
      game.load.image('bird4', 'frame-4.png');
      game.load.image('obstacle', 'obstacle.png');
      game.load.image('worldBoundary', 'world-boundary.png');
  },

  // Initializes the game and defines socket listeners for server multiplayer state changes
  create: function() { 
    this.socket = io(window.location.origin)
    this.socket.on('connect', () => console.log('I have made a persistent two-way connection to the server!'));
  
    game.stage.backgroundColor = '#71c5cf';

    game.physics.startSystem(Phaser.Physics.ARCADE);

    game.stage.disableVisibilityChange = true;
    
    this.otherPlayers = this.add.group();
    this.obstaclesBottom = this.add.group();
    this.obstaclesTop = this.add.group();

    this.text = game.add.text(20, 20, `${this.obstacleNum}`, { font: "30px Arial", fill: "#ffffff" }); 

    mainState.addWorldLeftBound();

    for(let i = 0; i < 50; i++) {
      this.obstacleList.push(Math.floor(Math.random() * 200) + 50);
    }
   
    this.socket.on('currentPlayers', function (players) {
      Object.keys(players).forEach(function(id) {
        if(players[id].playerId === mainState.socket.id) {
          mainState.addPlayer(players[id]);
        } else {
          mainState.addOtherPlayers(players[id]);
        }
      })
    });

    this.socket.on('newPlayer', function (player) {
      mainState.addOtherPlayers(player);
    });

    this.socket.on('disconnect', function(playerId) {
      mainState.otherPlayers.children.forEach(function(otherPlayer) {
        if(playerId == otherPlayer.playerId) {
          otherPlayer.destroy();
        }
      });
    });

    this.socket.on('playerHasMoved', function (player) {
      mainState.otherPlayers.children.forEach(function (otherPlayer) {
        if (player.playerId === otherPlayer.playerId) {
          otherPlayer.position.x = player.distToWorldLeftBound - mainState.bird.distToWorldLeftBound + mainState.bird.position.x;
          otherPlayer.position.y = player.y;
          game.add.tween(otherPlayer).to({angle: player.angle}, 100).start();
        }
      });
    });

    this.socket.on('updatedHighScoreList', function (highScoreList) {
      let highScoreListElement = document.getElementById("high-score-list");
      if (highScoreListElement !== null) {
        highScoreListElement.parentNode.removeChild(highScoreListElement);
      }
      mainState.displayHighScoreList(highScoreList);
    });

  },

  update: function() {

    let obstacle;
    let obstacleBottom;
    let obstacleTop;
    
    this.spaceKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

    if (this.obstaclesBottom.children.length === 0) {
      obstacle = mainState.addObstacle(mainState.obstacleNum);
      obstacleBottom = obstacle.obstacleBottom;
      obstacleTop = obstacle.obstacleTop;
      obstacleBottom.outOfBoundsKill = false;
      this.obstaclesBottom.add(obstacleBottom);
      this.obstaclesTop.add(obstacleTop);
    } else {
      obstacleBottom = this.obstaclesBottom.children[mainState.obstacleNum];
      obstacleTop = this.obstaclesTop.children[mainState.obstacleNum+1];
    }

    if (obstacleBottom !== undefined && obstacleBottom.position.x < this.gameWidth / 2) {
      obstacle = mainState.addObstacle(mainState.obstacleNum);
      obstacleBottom = obstacle.obstacleBottom;
      obstacleTop = obstacle.obstacleTop;
      this.obstaclesBottom.add(obstacleBottom);
      this.obstaclesTop.add(obstacleTop);
      mainState.obstacleNum = mainState.obstacleNum + 1;
    }

    game.physics.arcade.overlap(this.bird, this.obstaclesBottom, () => mainState.restartGame(), null, this);
    game.physics.arcade.overlap(this.bird, this.obstaclesTop, () => mainState.restartGame(), null, this);

    if (this.bird !== undefined) {
      if (this.bird.y < 0) {
          this.bird.y = 1;     
          this.bird.body.gravity.y = 1000;
      }
      // Game Over reset and update high score list
      if (this.bird.y > this.gameHeight) {
          this.socket.emit('updateHighScoreList', mainState.obstacleNum);
          this.obstaclesBottom.destroy();
          this.obstaclesTop.destroy();
          mainState.obstaclesBottom = this.add.group();
          mainState.obstaclesTop = this.add.group();
          this.worldLeftBound.position.x = 0;
          mainState.obstacleNum = 0;
          this.bird.y = 245;
          this.bird.body.velocity.y = 0;
          this.bird.isAlive = true;
      }
      if (this.bird.angle < 20) {
          this.bird.angle += 1;
      }
      if (this.spaceKey.isDown && this.bird.spaceDown == false && this.bird.isAlive == true) {
          game.add.tween(this.bird).to({angle: -20}, 100).start();
          this.bird.body.velocity.y = -500;
          this.bird.body.gravity.y = 1000;
          this.bird.spaceDown = true;
      }
      if (this.spaceKey.isUp) {
          this.bird.spaceDown = false;
      }
      if (new Date() - mainState.lastTimeSend > 10) {
        this.bird.distToWorldLeftBound = this.bird.x - this.worldLeftBound.position.x;
        this.socket.emit('handlePlayerMovement', this.bird.x, this.bird.y, this.bird.angle, this.bird.distToWorldLeftBound, mainState.obstacleNum);
        mainState.lastTimeSend = new Date();
      }
    }
    // Refreshes score in the upper left hand corner of the game
    this.text.destroy();
    this.text = game.add.text(20, 20, `${mainState.obstacleNum}`, { font: "50px Courier New", fill: "#ffffff" }); 
  }
};

// Initialize Phaser
let game = new Phaser.Game(mainState.gameWidth, mainState.gameHeight);

// Add the 'mainState' and call it 'main'
game.state.add('main', mainState); 

// Initialize state to start the game
game.state.start('main');

document.addEventListener('DOMContentLoaded', game);

let nameInput = document.getElementById("name-input");
let nameSubmit = document.getElementById("name-submit");

// Sets player name on submit
nameSubmit.onclick = () => {
  game.state.states.main.socket.emit('playerNameSet', nameInput.value);
}

// Displays high score list
if (game.state.states.main.socket !== null) {
  game.state.states.main.socket.on('updatedHighScoreList', function (highScoreList) {
    let highScoreListElem = document.createElement("div");
    if (highScoreList.length > 0) {
      for (let i = 0; i < highScoreList.length; i++) {
        highScoreListElem.append(highScoreList[i]);
      }
    }
  });
}


