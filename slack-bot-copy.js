/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
# RUN THE BOT:
  Get a Bot token from Slack:
    -> http://my.slack.com/services/new/bot
  Run your bot from the command line:
    token=<MY TOKEN> node team_bot.js
# EXTEND THE BOT:
  Botkit is has many features for building cool and useful bots!
  Read all about it here:
    -> http://howdy.ai/botkit
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
var request = require('request');
var Botkit = require('botkit');

function p(x) {
  console.log(x);
}

if (!process.env.token) {
  console.log('Error: Specify token in environment');
  process.exit(1);
}

var controller = Botkit.slackbot({
  debug: false,
  json_file_store: './db_copybot/'
});

controller.configureSlackApp({
  clientId: process.env.clientId,
  clientSecret: process.env.clientSecret,
  redirect_uri: 'http://localhost:3002',
  scopes: ['team:read','users:read','channels:read','im:read','im:write','groups:read','emoji:read']
});

controller.setupWebserver(process.env.PORT, function(err,webserver) {
  // set up web endpoints for oauth, receiving webhooks, etc.
  controller
    .createHomepageEndpoint(controller.webserver)
    .createOauthEndpoints(controller.webserver,function(err,req,res) {
      if (err){
          res.end("Error: " + err);
      }
      else 
          res.end("Installation successful! Your Slack team can now use @copybot to copy messages between channels. " + 
      "For example, in #general you might say 'Sounds like a problem for #marketing @copybot' in order to copy the message to #marketing.");
      
    })
    .createWebhookEndpoints(controller.webserver);
});


controller.spawn({
  token: process.env.token
}).startRTM(function(err,bot,payload) {
  //update_channels(bot);
  trackBot(bot);
  if (err) {
    p(err);
    throw new Error(err);
  }
});

//dictionary of channel_id:channel for every channel in every team this bot is a member of.
var channels = {};

/* Updates the list of all the channels of every team the bot is a member of, 
and calls a function that requires an accurate list of channels at the end.*/
function update_channels(bot, cb, args)
{
    bot.api.channels.list({},function(err,response) {
        for (var i = 0; i < response.channels.length; i++)
            if (response.channels[i].is_channel)
                channels[response.channels[i].id] = response.channels[i];
        if (cb)
          cb(bot, args);
    });
}

/*
get_channels_from_message() takes a message object and parses it to find any channels referenced.
    channel references always look like "<#{ID}>", so that's what it looks for.
    This function returns an array of objects of position and channel id, where
    position is the index of the '<' for that channel reference in the message text, and id is the channel id.
*/
function get_channels_from_message(message)
{
    var channels = [];
    message = message.text;
    while (message.indexOf('#') > -1)
    {
        var index = message.indexOf('#');
      
        var submessage = message.substring(index + 1);
        message = message.substring(0,index) + '\\' + message.substring(index + 1);
        
        var channel_id = submessage.substring(0, submessage.indexOf('>'));
        channels.push({ pos: index-1, id: channel_id});
    }
    return channels;
}

/*
Returns a list of the ids of the channels this bot is a member of
*/
function get_member_channels(bot)
{
    var member_channels = [];
    for (var id in channels) 
        if (channels[id].is_member)
            member_channels.push(id);
    return member_channels;
}

controller.on('direct_message,direct_mention,mention', function(bot, message) {
  update_channels(bot, message_respond, message);
})

function message_respond(bot, message) {
  p("Message recieved...");
  // get channels that we will copy to
  var message_channels = get_channels_from_message(message);

  if (channels[message.channel])
      var newMessageText = "<#" + message.channel + ">: " + message.text
  else
      var newMessageText = "<@" + message.user +">: " + message.text
  // strip the message text of stuff we don't actually want to copy
  // (i.e. "@copybot")
  var bot_name = "<@" + bot.identity.id + ">";
  newMessageText = newMessageText.replace(' ' + bot_name, '');
  
  /*
  // --just for debugging--
  if (message.text.indexOf('debug') > -1)
  {
      var channel_ids = [];
      for (var i = 0; i < message_channels.length; i++)
          channel_ids.push("<#" + message_channels[i].id + ">");
      bot.reply(message, "Copying \"" + message.text + "\" to the following channels: " + channel_ids.join(', '));
  }
  // --end debugging--
  */

  // actually copy messages
  for (var i = 0; i < message_channels.length; i++)
  {   
      var channel = channels[message_channels[i].id];
      if (!channel) {
          var dummy = 0; //Not sure if I should make a reply here.
          console.log("invalid channel: " + message_channels[i].id);
      }
      else if (get_member_channels(bot).indexOf(channel.id) > -1)
        bot.say({text: newMessageText, channel: channel.id }); 
      else 
        bot.say({text: "Hey man, I'd love to copy this but I can't. Can you /invite @copybot to channel <#" + channel.id + ">?", channel: message.channel})
  }
}

var _bots = {};
function trackBot(bot) {
  _bots[bot.config.token] = bot;
}

controller.storage.teams.all(function(err, all_team_data) {
  p("Loading stored teams...")
   for (var team in all_team_data) {
     var bot = controller.spawn(all_team_data[team])
     .startRTM(function(err) {
       update_channels(bot);
       if (err) {
         throw new Error(err);
       }
       else {
         trackBot(bot);
       }
     });
     p("loaded");
   }
});

controller.on('create_bot',function(bot, config) {
  if (_bots[bot.config.token]) {
    // already online! do nothing.
  } else {
    bot.startRTM(function(err) {
      if (!err) 
        trackBot(bot);
      bot.startPrivateConversation({user: config.createdBy},function(err,convo) {
        if (err) {
          p(err);
        } else {
          convo.say('I am a bot that has just joined your team');
          convo.say('You must now /invite me to a channel so that I can be of use!');
        }
      });
    })
  }
})

request.get("https://copybot.herokuapp.com")