# claude-mods

Personal Claude Code mods, installable as a plugin marketplace.

## statusband

A band above the prompt in the Claude desktop app and terminal, a condensed
`/usage`: context fill and tokens, the 5-hour and weekly quota with reset
times, prompt-cache hit rate, session cost and active time. Percentages turn
amber and red as they fill. Cache hit rate and active time count turns since
the mod loaded.

### Install

At the prompt of a terminal session:

```
/plugin install statusband --marketplace miloaissatu/claude-mods
```

From a shell:

```
claude plugin install statusband --marketplace miloaissatu/claude-mods
```

In the desktop app: click + next to the prompt box, then Plugins, Add
marketplace with `miloaissatu/claude-mods`, then Add plugin.

The repository is private, so each machine needs a git credential for
github.com first: an SSH key on the GitHub account, or `gh auth login` then
`gh auth setup-git`. The install never prompts for one.
