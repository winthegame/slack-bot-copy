# @copy bot

`@copy` is a bot that copies messages from one Slack channel to another. It's simple, free, and open-source. Here's what it does.

Let's say I'm in `#support-ios` and I say
```Let's bring the startup bug up in #dev @copy```
Because I referenced `@copy`, he'll copy my message to `#dev`. And he'll also mark it as having come from me in `#support-ios`.

This is what he'll say in the `#dev` channel:
```@rafaelcosman in #support-ios: Let's bring the startup bug up in #dev @copy```

That's it! This is useful for
1. moving conversations from one channel
2. alerting folks in another channel that they might be interested in the conversation in your channel.
