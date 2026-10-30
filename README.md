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

## statuspane

A docked pane beside the transcript, a live condensed `/usage`: the 5-hour and
weekly limits with reset times, context fill, session cost, active time, cache
hit rate and a token breakdown. Open it with `/statuspane`.

### Install

```
/plugin install statuspane --marketplace miloaissatu/claude-mods
```

The repository is private, so each machine needs a git credential for
github.com first: an SSH key on the GitHub account, or `gh auth login` then
`gh auth setup-git`. The install never prompts for one.
