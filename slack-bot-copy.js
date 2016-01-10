/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
# RUN THE BOT:
  Get a Bot token from Slack:
    -> http://my.slack.com/services/new/bot
  Run your bot from the command line:
    token=<MY TOKEN> node slack-bot-copy.js
# EXTEND THE BOT:
  Botkit is has many features for building cool and useful bots!
  Read all about it here:
    -> http://howdy.ai/botkit
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

var Botkit = require('botkit');
var mongo_storage = require('botkit-storage-mongo')({mongoUri:  process.env.mongoUri});
var _ = require("underscore"); // http://underscorejs.org/

var controller = Botkit.slackbot({
  debug: false,
  storage: mongo_storage
});

var _bots = {};
function trackBot(bot) {
  _bots[bot.config.token] = bot;
} 

if (process.env.clientId && process.env.clientSecret) {
  controller.configureSlackApp({
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    redirect_uri: 'https://slack-bot-copy.herokuapp.com/oauth',
    scopes: ['bot']
  });
  
  controller.setupWebserver(process.env.PORT, function(err,webserver) {
    // set up web endpoints for oauth, receiving webhooks, etc.
    controller
      .createHomepageEndpoint(controller.webserver)
      .createOauthEndpoints(controller.webserver,function(err,req,res) {
        if (err) {
            res.end("Error: " + err);
        }
        else 
            res.end("Installation successful! Your Slack team can now use @copy to copy messages between channels. " + 
        "For example, in #general you might say 'Let's talk about this project in #marketing @copy' in order to copy your message to #marketing.");
        
      })
      .createWebhookEndpoints(controller.webserver);
  });
  
  controller.storage.teams.all(function(err, all_team_data) {
    console.log("Loading stored teams..." + all_team_data)
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
       console.log("loaded");
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
            console.log(err);
          } else {
            convo.say("Yo!");
            convo.say("I'm <@" + bot.identity.id + ">");
            convo.say("I'm good at moving conversations from one #channel to another.");
            convo.say("For example, to move a convo to #random, just say something like '...let's move this convo to #random <@" + bot.identity.id + ">");
            convo.say("But I can't help move convos if I'm not in any channels.");
            convo.say("Can you /invite <@" + bot.identity.id + "> to a few channels?");
          }
        });
      })
    }
  })
} else {
  console.log ("process.env.clientId && process.env.clientSecret were not specified in environment.");
  console.log ("Thus this bot cannot offer oauth.");
}
  
if (process.env.token) {
  controller.spawn({
    token: process.env.token
  }).startRTM(function(err,bot,payload) {
    //update_channels(bot);
    trackBot(bot);
    if (err) {
      console.log(err);
      throw new Error(err);
    }
  });
} else {
  console.log ("process.env.token was not specified in environment. This is ok if you are offering OAUTH.");
}

//dictionary of channel_id:channel for every channel in every team this bot is a member of.
var channels = {};

/* Updates the list of all the channels of every team the bot is a member of, 
and calls a function that requires an accurate list of channels at the end.*/
function update_channels(bot, cb, args)
{
    bot.api.channels.list({}, function(err,response) {
        for (var channel of response.channels)
            if (channel.is_channel)
                channels[channel.id] = channel;
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
  var messageText = message.text
  var channels_in_message = [];
  while (messageText.indexOf('#') > -1) {
    var index = messageText.indexOf('#');
  
    var submessage = messageText.substring(index + 1);
    messageText = messageText.substring(0,index) + '\\' + messageText.substring(index + 1);
    
    var channel_id = submessage.substring(0, submessage.indexOf('>'));
    channels_in_message.push(channel_id);
  }
  return channels_in_message;
}

controller.hears(["help"], ["direct_message", "direct_mention", "mention"], function(bot, message) {
  bot.reply(message, "Hey there <@" + message.user + ">, I'll tell you all about myself in a private message :wink:");
  
  bot.startPrivateConversation(message, function(err, convo) {
    if (err) {console.log(err); return;}
    convo.say("Hi! Ever found yourself :printer: copying messages to other channels? I make that easy as :cake:.");
    convo.say("For example in `#general`, you might say `Let's ask #dev about the overflow bug <@" + bot.identity.id + ">` and I'll copy your message to `#dev`.");
    convo.say("If I'm useful install me in your other teams or share me with your friends. I'm :free: and :open_book: open source.");
    convo.say("Here's my github repo: https://github.com/winthegame/slack-bot-copy and here's a link to instantly install me in another :slack:Slack slack-bot-copy.herokuapp.com/login");
    convo.next();
  });
});

controller.on("direct_message,direct_mention,mention", function(bot, message) {
  update_channels(bot, message_respond, message);
})

function message_respond(bot, message) {
  var to_channel_ids = _. uniq(get_channels_from_message(message)); // get channels that we will copy to and remove duplicates
  var to_channels = _.pick(channels, to_channel_ids)
  
  if (channels[message.channel])
      var pretext = "<@" + message.user +"> in <#" + message.channel + ">: "
  else
      var pretext = "<@" + message.user +">: "
  
  // actually copy messages
  for (to_channel_id in to_channels) {
    if (channels[to_channel_id].is_member)
      bot.say({
        channel: to_channel_id,
        attachments: [{
          pretext: pretext,
          text: message.text,
          fallback: message.text
        }]
      });
    else 
      bot.say({
        text: "Hey, I'd love to copy this to <#" + to_channel_id + "> but I can't. Can you /invite <@" + bot.identity.id + "> to channel <#" + to_channel_id + ">?",
        channel: message.channel
      });
  }
}
