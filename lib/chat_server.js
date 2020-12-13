var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server) {

  // start socketio server piggybacking off http server
  io = socketio.listen(server);
  io.set('log level', 1);

  // define how user connections are handled
  io.sockets.on('connection', function(socket) {
    guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);

    // place user in lobby when they first join
    joinRoom(socket, 'Lobby');

    // handle various user events
    handleMessageBroadCasting(socket, nickNames);
    handleNameChangeAttempts(socket, nickNames, namesUsed);
    handleRoomJoining(socket);

    // provide user with list of rooms on request
    socket.on('rooms', function() {
      socket.emit('rooms', io.sockets.manager.rooms);
    });

    // cleanup logic when user disconnects
    handleClientDisconnection(socket, nickNames, namesUsed);
  })
}

function assignGuestName(socket, guestNumber, nickNames, namesUsed){
  // set default name
  var name = 'Guest' + guestNumber;
  nickNames[socket.id] = name;

  // notify user of their guest name
  socket.emit('nameResult', {
    success: true,
    name : name
  });

  // add new guest name to list
  namesUsed.push(name);

  // increment counter for generating guest names
  return guestNumber + 1;
}

// handles joining a room
function joinRoom(socket, room){
  // make user join room
  socket.join(room);
  // set current room to this one
  currentRoom[socket.id] = room;

  // notify user that joined
  socket.emit('joinResult', {room:room});

  // notify all users in room
  socket.broadcast.to(room).emit('message', {
    text: nickNames[socket.id] + ' has joined ' + room + '.'
  });

  // get other users in room
  var usersInRoom = io.sockets.clients(room);

  // display those users to new user
  if(usersInRoom.length > 1){
    var usersInRoomSummary = 'Users currently in ' + room + ': ';
    // building a string of the users in the room
    for(var index in usersInRoom){
      var userSocketId = usersInRoom[index].id;

      if(userSocketId != socket.id){
        if(index > 0){
          usersInRoomSummary += ', ';
        }
        usersInRoomSummary += nickNames[userSocketId];
      }
    }
    usersInRoomSummary+= '.';
    socket.emit('message', {text: usersInRoomSummary});
  }
}

function handleNameChangeAttempts(socket, nickNames, namesUsed){
  socket.on('nameAttempt', function(name) {
    // dont allow names to begin with 'Guest'
    if (name.indexOf('Guest') == 0){
      socket.emit('nameResult', {
        success: false,
        message: 'Names cannot begin with "Guest".'
      });
    } else {
      // if name isn't already registered, register it
      if (namesUsed.indexOf(name) == -1){
        var previousName = nickNames[socket.id];
        var previousNameIndex = namesUsed.indexOf(previousName);
        namesUsed.push(name);
        nickNames[socket.id] = name;
        // delete old name to free space
        delete namesUsed[previousNameIndex];
        // send result
        socket.emit('nameResult', {
          success: true,
          name: name
        });
        // notify users in room of name change
        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
          test: previousName + ' is now known as ' + name + '.'
        });
      } else  {
        // send error if name is already registered
        socket.emit('nameResult', {
          success: false,
          message: 'That name is already in use.'
        });
      }
    }
  })
}

function handleMessageBroadCasting(socket){
  socket.on('message', function(message) {
    // send message data to all users
    socket.broadcast.to(message.room).emit('message', {
      text: nickNames[socket.id] + ': ' + message.text
    });
  });
}

function handleRoomJoining(socket){
  // leave current room and join new room
  socket.on('join', function(room) {
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket, room.newRoom);
  });
}

function handleClientDisconnection(socket){
  socket.on('disconnect', function() {
    var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
    // clear user's names from name charts to free for other users
    delete namesUsed[nameIndex];
    delete nickNames[socket.id];
  })
}
