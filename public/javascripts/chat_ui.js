// process untrusted content, prevent xss attacks
function divEscapedContentElement(message){
  return $('<div></div>').text(message);
}

// process trusted content
function divSystemContentElement(message){
  return $('<div></div>').html('<i>' + message + '</i>');
}

function processUserInput(chatApp, socket) {
  var message = $('#send-message').val();
  var systemMessage;

  // if input starts with a '/', treat it like a command
  if (message.charAt(0) == '/') {
    systemMessage = chatApp.processCommand(message);
    if (systemMessage) {
      $('#messages').append(divSystemContentElement(systemMessage));
    }
  } else {
    // broadcast non-command input to other users
    chatApp.sendMessage($('#room').text(), message);
    $('#messages').append(divEscapedContentElement(message));
    $('#messages').scrollTop($('#messages').prop(scrollHeight));
  }

  $('#send-message').val('');
}

// create new connection
var socket = io.connect();

$(document).ready(function(){
  var chatApp = new Chat(socket);

  // display results of a name change
  socket.on('nameResult', function(result){
    var message;

    if(result.success) {
      message = 'You are now known as ' + result.name +'.';
    } else {
      message = result.message;
    }
    $('#messages').append(divSystemContentElement(message));
  });

  // display results of joining room
  socket.on('joinResult', function(result){
    $('#room').text(result.room);
    $('#messages').append(divSystemContentElement('Room changed.'));
  });

  // display new messages
  socket.on('message', function(message){
    var newElement = $('<div></div>').text(message.text);
    $('#messages').append(newElement);
  });

  // display room list
  socket.on('rooms', function(rooms) {
    $('#room-list').empty();

    // build list of rooms
    for(var room in rooms){
      room = room.substring(1, room.length);
      if (room != ''){
        $('#room-list').append(divEscapedContentElement(room));
      }
    }

    // add click handler for room list
    $('#room-list div').click(function(){
      chatApp.processCommand('/join ' + $(this).text());
      $('#send-message').focus();
    });
  });

  // periodically display rooms
  setInterval(function() {
    socket.emit('rooms')
  }, 1000);

  $('#send-message').focus();

  // allow submitting the form to send chat message
  $('send-form').submit( function() {
    processUserInput(chatApp, socket);
    return false;
  });
});
