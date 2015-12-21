# slack-copy-bot

The Copy Bot is a bot that copies messages from one Slack channel to another. It's very simple. Here's what it does.

Let's say I'm in the #general channel and I say
```That was super #random```.
Great. Nothing happens. The message is NOT copied to the #random channel.

Let's say I'm in #general and I say
```That was super #random @copybot```
Now, because I references @copybot, he'll copy my message to #random. And he'll also mark it as having come from #general.

This is what he'll say:
```#general: That was super #random```

That's it!

Probability that this bot will be useful to us: HIGH
Probability that this bot will be useful to others: LOW
Difficulty of making this bot: EASY
