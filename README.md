# Easily copy messages to other Slack channels.

## Installation 
Click [here](http://slack-bot-copy.herokuapp.com/login) to instantly add `@copy` bot to your Slack. You're also welcome to host `@copy` yourself!

## Usage

Ever find yourself copying a slack message from one channel to another? `@copy` does this for you. It's simple, free, and open-source. Here's how it works:

Let's say I'm in `#support-ios` and I say
```Let's bring the memory overflow bug up in #dev @copy```
Because I referenced `@copy`, he'll copy my message to `#dev`. And he'll also mark it as having come from me in `#support-ios`.

This is what he'll say in the `#dev` channel:
```@rafaelcosman in #support-ios: Let's bring the memory overflow bug up in #dev @copy```

That's it! This simple tool is useful for

1. moving conversations from one channel to another
2. alerting folks in another channel that they might want to join the conversation in your channel.

And many other things that I haven't even thought of yet! Feel free to tell me how you're using `@copy` -- drop me a line at rafaelcosman@gmail.com.

## Privacy

`@copy` stores none of your messages.

`@copy` cannot join channels by himself, a user must invite him.
