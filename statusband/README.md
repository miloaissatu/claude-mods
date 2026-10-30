# statusband

A band above the prompt that condenses `/usage` into one line: context fill and
tokens, the 5-hour and weekly quota with reset times, prompt-cache hit rate,
session cost and active time.

Percentages turn amber and red as they fill. Context turns risky sooner than
quota does. Cache hit rate and active time count turns since the mod loaded.

## Use

Install it, then the band appears above the prompt in the Claude desktop app
and terminal. Nothing to configure: each figure comes from the session itself.

The band is hidden while a survey is showing, and when there is nothing to
show yet.

## Setup

No settings and no API keys. Install from the `miloaissatu/claude-mods`
marketplace; the install needs a git credential for github.com, since the
repository is private.

```
/plugin install statusband --marketplace miloaissatu/claude-mods
```
