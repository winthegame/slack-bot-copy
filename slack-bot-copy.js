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
      res.end("Installation successful! Your Slack team can now use Copybot.");
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

// a list of current channel objects, which have id and name fields.
// both fields are strings, and the id field does not have a '#' at the front.
var channels = [];
/*
get_channel_by_id() takes the id of a channel (string, without the '#' at the beginning)
    and returns the name of the channel if it exists, or undefined if it does not
*/
function get_channel_by_id(id)
{
    for (var i = 0; i < channels.length; i++)
        if (channels[i].id === id)
            return channels[i];
    return undefined;
}
/*
get_channel_list() takes a bot object and uses the bot to get an up-to-date list of channels.
    It returns nothing, and just updates the global channels variable.
*/
function get_channel_list(bot)
{
    bot.api.channels.list({},function(err,response) {
        for (var i = 0; i < response.channels.length; i++)
            if (response.channels[i].is_channel)
                channels.push(response.channels[i]);
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
    for (var i = 0; i < channels.length; i++) {
        if (channels[i].is_member)
            member_channels.push(channels[i].id);
    }
    return member_channels;
}

controller.on('direct_message,direct_mention,mention', function(bot, message) {
  console.log("Message recieved...");
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
      var channel = get_channel_by_id(channels[i].id);
      if (!channel)
          var dummy = 0; //Not sure if I should make a reply here.
      else if (get_member_channels(bot).indexOf(channel.id) > -1)
      {
          var message = {
              text: message.text,
              channel: channel.id // with or without the '#', bot.say() doesn't work...
          };
          bot.say(message); // y u n0 work m8
      }
      else 
      {
          var text = "Hey man, I'd love to copy this but I can't. Can you /invite @copybot to channel <#" + channel.id + ">?"
          var message = {
              text: text,
              channel: message.channel
          };
          bot.say(message)
      }
  }
})