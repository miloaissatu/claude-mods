import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Totals, Usage } from '../types'

const PANE = 'statuspane'

const usage = atom({ plugin: 'statuspane', key: 'usage' } as const, null)
// Change the tag when Totals' fields change: it declines what an earlier
// version stored, which outlives a reload.
const totals = atom(
  { plugin: 'statuspane', key: 'totals' } as const,
  { input: 0, output: 0, read: 0, write: 0, activeMs: 0, model: '' },
  { shape: 'totals-1' },
)

const fmtK = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// "1:50 PM", or "Mon 5:00 AM" when the reset is a day or more away
const resetAt = (iso: string | undefined, now: number) => {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (Number.isNaN(t) || t <= now) return ''
  const d = new Date(t)
  const h = d.getHours()
  const clock = `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`

  return t - now >= 86_400_000 ? `${DAYS[d.getDay()]} ${clock}` : clock
}

const fmtDur = (ms: number) => {
  const s = Math.round(ms / 1000)
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
  if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`

  return `${s}s`
}

const windowName = (kind: string) =>
  kind === 'five_hour' ? '5-hour limit' : kind === 'seven_day' ? 'Weekly · all models' : kind

const toUsage = (s: {
  context: { percent?: number; tokens?: number; window: number }
  rateLimits: { kind: string; percentUsed: number; resetsAt?: string }[]
  cost?: { usd: number }
}): Usage => ({
  ctxPercent: s.context.percent ?? null,
  ctxTokens: s.context.tokens ?? null,
  ctxWindow: s.context.window,
  limits: s.rateLimits.map(r => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt })),
  usd: s.cost?.usd ?? null,
})

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'statuspane',
      description: 'Open the live usage pane beside the transcript',
    })
    void $.ui.open({ id: PANE, title: 'Usage' })

    return next(e)
  })

  on('command.run', { command: 'statuspane' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Usage' })

    return { text: 'Usage pane opened.' }
  })

  on('session.measure', async ($, e, next) => {
    await update($, usage, () => toUsage(e))

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const u = e.usage
    await update($, totals, (t: Totals) => ({
      input: t.input + (u?.input_tokens ?? 0),
      output: t.output + (u?.output_tokens ?? 0),
      read: t.read + (u?.cache_read_input_tokens ?? 0),
      write: t.write + (u?.cache_creation_input_tokens ?? 0),
      activeMs: e.agentId ? t.activeMs : t.activeMs + e.durationMs,
      model: u?.model ?? t.model,
    }))

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const u = (await read($, usage)) ?? toUsage(await $.session.usage())
    const t = await read($, totals)
    const now = await $.clock.now()

    // green -> amber -> red by how full; context turns risky sooner than quota
    const tone = (pct: number, risk = 100) => {
      const p = (pct * 100) / risk
      return p >= 80 ? '#f87171' : p >= 55 ? '#fbbf24' : '#4ade80'
    }

    const Row = (p: { name: string; value: unknown; k?: string }) => (
      <Box key={p.k ?? p.name} justifyContent="space-between">
        <Text dimColor>{p.name}</Text>
        {p.value}
      </Box>
    )

    const seen = t.input + t.read + t.write
    const hit = seen > 0 ? Math.round((t.read / seen) * 100) : null

    return (
      <Box flexDirection="column" rowGap={1}>
        <Box flexDirection="column">
          <Text bold>Usage</Text>
          {u.limits.length === 0 && <Text dimColor>No limit readings yet.</Text>}
          {u.limits.map(r => {
            const pct = Math.round(r.percentUsed)
            const reset = resetAt(r.resetsAt, now)

            return (
              <Box key={r.kind} flexDirection="column">
                <Box justifyContent="space-between">
                  <Text dimColor>{windowName(r.kind)}</Text>
                  <Text color={tone(pct)} bold>{pct}%</Text>
                </Box>
                {reset !== '' && <Text dimColor>  resets {reset}</Text>}
              </Box>
            )
          })}
        </Box>

        <Box flexDirection="column">
          <Text bold>Context</Text>
          {u.ctxPercent === null ? (
            <Text dimColor>No reading yet.</Text>
          ) : (
            <Box justifyContent="space-between">
              <Text dimColor>{fmtK(u.ctxTokens ?? 0)} / {fmtK(u.ctxWindow)}</Text>
              <Text color={tone(u.ctxPercent, 85)} bold>{u.ctxPercent}%</Text>
            </Box>
          )}
        </Box>

        <Box flexDirection="column">
          <Text bold>This session</Text>
          {u.usd !== null && <Row name="Cost" value={<Text>${u.usd.toFixed(2)}</Text>} />}
          <Row name="Active" value={<Text>{fmtDur(t.activeMs)}</Text>} />
          {hit !== null && (
            <Row
              name="Cache hit"
              value={<Text color={hit < 30 ? '#f87171' : hit < 60 ? '#fbbf24' : '#4ade80'}>{hit}%</Text>}
            />
          )}
        </Box>

        <Box flexDirection="column">
          <Box justifyContent="space-between">
            <Text bold>Breakdown</Text>
            <Text dimColor>{t.model}</Text>
          </Box>
          <Row name="Input" value={<Text>{fmtK(t.input)}</Text>} />
          <Row name="Output" value={<Text>{fmtK(t.output)}</Text>} />
          <Row name="Cache read" value={<Text>{fmtK(t.read)}</Text>} />
          <Row name="Cache write" value={<Text>{fmtK(t.write)}</Text>} />
        </Box>

        <Text dimColor>Since the mod loaded; may differ from /usage.</Text>
      </Box>
    )
  })
}
