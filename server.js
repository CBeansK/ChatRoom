// dependencies
var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var cache = {};

// create server, define per-request behavior
var server = http.createServer(function(request, response) {
  var filePath = false;

  // find which html file to serve
  if (request.url == '/') {
    // serve default html
    filePath = 'public/index.html';
  } else {
    // translate url to find relative file path
    filePath = 'public' + request.url;
  }

  var absPath = './' + filePath;
  serveStatic(response, cache, filePath);
})

// handle 404 errors (requesting files that don't exist)
function send404(response){
  // write HTTP header for response
  response.writeHead(404, {'Content-Type': 'text/plain'});
  response.write('Error 404: Response not found');
  response.end();
}

// serve file data when requested
function sendFile(response, filePath, fileContents){

  // write appropriate http header (200 OK)
  response.writeHead(
    200,
    {"content-type": mime.lookup(path.basename(filePath))}
  );
  // send contents of file
  response.end(fileContents);
}

// tries to find a file in either cache or disk and sends appropriate response
function serveStatic(response, cache, absPath){

  // if the data is cached, just retrieve it
  if(cache[absPath]){
    sendFile(response, absPath, cache[absPath]);

    // otherwise we need to check the disk
  } else {
    // check file system for the data in the path
    fs.exists(absPath, function(exists){
      if (exists){
        // read it and send if it exists
        fs.readFile(absPath, function(err, data){
          if(err){

            // if something occurs just dip out
            send404(response);
          } else {

            // cache after we read it
            cache[absPath] = data;
            sendFile(response, absPath, data);
          }
        });
      } else {
        // send 404 if not found
        send404(response);
      }
    })
  }
}

server.listen(3000, function() {
  console.log("Server listening on port 3000");
})
