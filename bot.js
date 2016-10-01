var HTTPS = require('https');
var botID = process.env.BOT_ID;
const express = require('express');
const router = express.Router();
var pg = require('pg-native');
var client= new pg();
client.connectSync(process.env.DATABASE_URL+'?ssl=true');

function addQuoteToDB(quote){
  try{
    client.querySync('INSERT INTO quotes (quote) values($1)',[quote]);
    return "Quote has been added.";
  }
  catch(err){
    console.log(err);
    return "Failed to add quote";
  }
}

function getRandomQuoteFromDB(){
    try{
      console.log("ran");
      results = client.querySync('SELECT * FROM quotes;');
      console.log(results);
      return results[Math.floor(results.length*Math.random())].quote;
    }
    catch(err){
      console.log(err);
      return "There was an error with the database call.";
    }
}


function respond() {
  var request = JSON.parse(this.req.chunks[0]),
      botRegex = /^\/turing .*$/;
  if(request.text){
    console.log("Asked to respond with text :" + request.text);
  }
  else{
    console.log("error with text");
  }
  if(request.text && botRegex.test(request.text)) {
    this.res.writeHead(200);
    postMessage(request.text.substring(8));
    this.res.end();
  } 
  else if(request.text && /goto/.test(request.text)){
    this.res.writeHead(200);
    postMessage("goto");
    this.res.end();
  }
  else {
    console.log("don't care");
    this.res.writeHead(200);
    this.res.end();
  }
}

function postMessage(text) {
  var isImage = false;
  var image = "";
  var botResponse, options, body, botReq;
  console.log("Current text is: " + text);
  if(/^help/.test(text)){
     botResponse = "current valid commands are:\n test - the bot passes the turing test.\n echo [text] - the turing bot says [text]\n halts [program p] [input i] - determines if p will halt with input i\n recurse [text] - prints a recursed version of [text].\n random - gives you an integer between 0 and 99.\n quote [text]- gives one of a collection of quotes, or makes [text] a quote.\n xkcd [comic_name] - finds the xkcd with the given name.\n status - lets you know how the bot is feeling\n help - displays this information.";
  }
  else if(/^test$/.test(text)){
     botResponse = "I am a human.";
  }
  else if(/^echo .*/.test(text)){
    botResponse = text.substring(5);
  }
  else if(/^recurse .*/.test(text)){
    var initial = text.substring(8);
    botResponse = "";
    for(var i = 0; i < initial.length; i++){
      botResponse += initial.substring(i, initial.length);
    }
  }
  else if(/^halts .*/.test(text)){
    if(Math.random()>.5){
      botResponse = "yes";
    }
    else{
      botResponse = "no";
    }
  }
  else if(/^random$/.test(text)){
    botResponse = String((Math.floor(Math.random() * 100)));
  }
  else if(/^xkcd .+/.test(text)){
    var data = text.split(" ");
    for(var i = 2; i < data.length; i++){
      data[1]+="_"+data[i];
    }
    if(data.length > 1){
      isImage = true;
      image = "http://imgs.xkcd.com/comics/"+data[1].toLowerCase()+".png";
    }
    else{
      botResponse = "Invalid xkcd format."
    }
  }
  else if(/^goto$/.test(text)){
      botResponse = "Goto considered harmful";
  }
  else if(/^quote.*/.test(text)){
    text = text.substring(6);
    if(text.length >6 && /^add .+/.test(text)){
      botResponse=addQuoteToDB(text.substring(4));
    }
    else{
      botResponse=getRandomQuoteFromDB();
    }
  }
  else if(/^status$/.test(text)){
    var rand = Math.random();
    if(rand>3/4){
      botResponse = "feels good man";
    }
    else if(rand>1/2){
      botResponse = "meh";
    }
    else if(rand>1/4){
      botResponse = "feels bad man";
    }
    else{
      botResponse = "it's over";
    }
  }
  else{
     botResponse = "Invalid command. Type /turing help for a list of valid commands.";
  }

  options = {
    hostname: 'api.groupme.com',
    path: '/v3/bots/post',
    method: 'POST'
  };

  if(!isImage){  
    body = {
      "bot_id" : botID,
      "text" : botResponse
    };
    console.log('sending ' + botResponse + ' to ' + botID);
  }
  else{
    body = {
      "bot_id" : botID,
      "text" : "",
      "attachments" : [{
        "type"  : "image",
        "url"   : image
      }]
    };
      console.log('sending image' + image + ' to ' + botID);
  }


  botReq = HTTPS.request(options, function(res) {
      if(res.statusCode == 202) {
        //neat
      } else {
        console.log('rejecting bad status code ' + res.statusCode);
      }
  });

  botReq.on('error', function(err) {
    console.log('error posting message '  + JSON.stringify(err));
  });
  botReq.on('timeout', function(err) {
    console.log('timeout posting message '  + JSON.stringify(err));
  });
  botReq.end(JSON.stringify(body));
}


exports.respond = respond;
