var Chat = function(socket) {
  this.socket = socket;
}

// send message to chat
Chat.prototype.sendMessage = function(room, text){
  var message = {
    room: room,
    text: text
  };
  this.socket.emit('message', message);
};

// change current room
Chat.prototype.changeRoom = function(room){
  this.socket.emit('join', {
    newRoom: room
  });
};

// process chat commands for handling
Chat.prototype.processCommand = function(command){
  // tokenize arguments to process
  var words = command.split(' ');
  var command = words[0].substring(1, words[0].length).toLowerCase();
  var message = false;

  switch(command){
    case 'join':
      words.shift();
      var room = words.join(' ');
      this.changeRoom(room);
      break;
    case 'nick':
      words.shift();
      var name = words.join(' ');
      this.socket.emit('nameAttempt', name);
      break;

    default:
      message = 'Unrecognized command.'
      break;
  }

  return message;
};
