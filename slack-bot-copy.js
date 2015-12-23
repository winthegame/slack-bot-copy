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

var Botkit = require('botkit');

if (!process.env.token) {
  console.log('Error: Specify token in environment');
  process.exit(1);
}

var controller = Botkit.slackbot({
 debug: false,
});

controller.configureSlackApp({
  clientId: process.env.clientId,
  clientSecret: process.env.clientSecret,
  redirect_uri: 'http://localhost:3002',
  scopes: ['team:read','users:read','channels:read','im:read','im:write','groups:read','emoji:read','chat:write:bot']
});

controller.setupWebserver(process.env.PORT,function(err,webserver) {
  // set up web endpoints for oauth, receiving webhooks, etc.
  controller
    .createHomepageEndpoint(controller.webserver)
    .createOauthEndpoints(controller.webserver,function(err,req,res) {
      res.end("YO");
    })
    .createWebhookEndpoints(controller.webserver);
});

controller.spawn({
  token: process.env.token
}).startRTM(function(err,bot,payload) {
  get_channel_list(bot);
  if (err) {
    throw new Error(err);
  }
});

var channels = [];
function get_channel_by_id(id)
{
    for (var i = 0; i < channels.length; i++)
        if (channels[i].id === id)
            return channels[i];
    return undefined;
}
function get_channel_list(bot)
{
    bot.api.channels.list({},function(err,response) {
        for (var i = 0; i < response.channels.length; i++)
            if (response.channels[i].is_channel)
                channels.push({ id: response.channels[i].id, name: response.channels[i].name });
    });
}

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
        channels.push({ pos: index-1, id: channel_id });
    }
    return channels;
}

function get_member_channels(bot){
    channels = [];
    for (var i = 0; i < channels.response.length; i++)
    {
        if(channels.response[i].is_member)
            channels.push(channels.response[i].id);
    }
    return channels;
}

controller.on('direct_message,direct_mention,mention', function(bot, message) {
  console.log("Working...");
  if (message.text === "\\update_channels")
  {
      bot.reply(message, "Updating channel list.");
      get_channel_list(bot);
      return;
  }

  // get channels that we will copy to
  var channels = get_channels_from_message(message);
  
  // strip the message text of stuff we don't actually want to copy
  // (i.e. "@copybot" and the 'copy' command at the start)
  var bot_name = "<@" + bot.identity.id + ">";
  if (message.text.indexOf(bot_name) > -1)
  {
      message.text = message.text.replace(' ' + bot_name, '');
  }
  message.text = "<#" + message.channel + ">: " + message.text;
  
  // --just for debugging--
  if (message.text.indexOf('debug') > -1)
  {
      var channel_ids = [];
      for (var i = 0; i < channels.length; i++)
          channel_ids.push("<#" + channels[i].id + ">");
      bot.reply(message, "Copying \"" + message.text + "\" to the following channels: " + channel_ids.join(', '));
  }
  // --end debugging--
  
  // actually copy messages
  for (var i = 0; i < channels.length; i++)
  {
      var channel_id = get_channel_by_id(channels[i].id).id;
      if (get_member_channels(bot).indexOf(channel_id) > -1)
      {
          var message = {
              text: message.text,
              channel: channel_id // with or without the '#', bot.say() doesn't work...
          };
          bot.say(message); // y u n0 work m8
      }
      else 
      {
          bot.reply(message, "Please enter \"invite @copybot\" in channel " + channels[i].name 
              + " so that Copybot can write to this channel.");
      }
  }
})