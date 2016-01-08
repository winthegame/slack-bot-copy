# @copy bot

## Installation 
You're welcome to host this bot yourself! Or you can click [here](http://slack-bot-copy.herokuapp.com/login) to immidiately add the bot to your Slack.

## Usage

Ever find yourself copying a slack message from one channel to another? `@copy` does this for you. It's simple, free, and open-source. Here's how it works:

Let's say I'm in `#support-ios` and I say
```Let's bring the memory overflow bug up in #dev @copy```
Because I referenced `@copy`, he'll copy my message to `#dev`. And he'll also mark it as having come from me in `#support-ios`.

This is what he'll say in the `#dev` channel:
```@rafaelcosman in #support-ios: Let's bring the memory overflow bug up in #dev @copy```

That's it! This is useful for

1. moving conversations from one channel to another
2. alerting folks in another channel that they might want to join the conversation in your channel.

## Privacy

`@copy` stores none of your messages.

`@copy` cannot join channels by himself, a user must invite him.
