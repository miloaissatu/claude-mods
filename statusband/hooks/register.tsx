import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Totals, Usage } from '../types'

const usage = atom({ plugin: 'statusband', key: 'usage' } as const, null)
const totals = atom(
  { plugin: 'statusband', key: 'totals' } as const,
  { input: 0, read: 0, write: 0, activeMs: 0 },
)

const fmtK = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}m` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`

const label = (kind: string) =>
  kind === 'five_hour' ? '5h' : kind === 'seven_day' ? '7d' : kind

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// 1:50p / 5a, with the weekday when the reset is a day or more away
const resetAt = (iso: string | undefined, now: number) => {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (Number.isNaN(t) || t <= now) return ''
  const d = new Date(t)
  const h = d.getHours()
  const m = d.getMinutes()
  const clock = `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'a' : 'p'}`
  const day = t - now >= 86_400_000 ? `${DAYS[d.getDay()]} ` : ''
  return ` ↻${day}${clock}`
}

const fmtDur = (ms: number) => {
  const m = Math.round(ms / 60_000)
  return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m` : `${m}m`
}

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
  on('session.measure', async ($, e, next) => {
    await update($, usage, () => toUsage(e))

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const u = e.usage
    await update($, totals, (t: Totals) => ({
      input: t.input + (u?.input_tokens ?? 0),
      read: t.read + (u?.cache_read_input_tokens ?? 0),
      write: t.write + (u?.cache_creation_input_tokens ?? 0),
      activeMs: e.agentId ? t.activeMs : t.activeMs + e.durationMs,
    }))

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }

    const u = (await read($, usage)) ?? toUsage(await $.session.usage())
    const t = await read($, totals)
    const now = await $.clock.now()
    const { Box, Text } = $.ui.resolve(e)

    // green -> amber -> red by how full; context turns risky sooner than quota
    const tone = (pct: number, risk = 100) => {
      const p = (pct * 100) / risk
      return p >= 80 ? '#f87171' : p >= 55 ? '#fbbf24' : '#4ade80'
    }

    const segs: unknown[] = []

    if (u.ctxPercent !== null) {
      const c = tone(u.ctxPercent, 85)
      segs.push(
        <Text key="ctx">
          <Text>📊 </Text>
          <Text color={c} bold>{u.ctxPercent}%</Text>
          <Text dimColor> {fmtK(u.ctxTokens ?? 0)}/{fmtK(u.ctxWindow)}</Text>
        </Text>,
      )
    }

    u.limits.forEach((r, i) => {
      const pct = Math.round(r.percentUsed)
      const c = tone(pct)
      segs.push(
        <Text key={r.kind}>
          {i === 0 ? '🚦 ' : ''}
          <Text dimColor>{label(r.kind)} </Text>
          <Text color={c} bold>{pct}%</Text>
          <Text dimColor>{resetAt(r.resetsAt, now)}</Text>
        </Text>,
      )
    })

    const seen = t.input + t.read + t.write
    if (seen > 0) {
      const hit = Math.round((t.read / seen) * 100)
      segs.push(
        <Text key="cache">
          <Text>⚡ </Text>
          <Text color={hit < 30 ? '#f87171' : hit < 60 ? '#fbbf24' : '#4ade80'} bold>{hit}%</Text>
        </Text>,
      )
    }

    if (u.usd !== null) {
      segs.push(
        <Text key="cost" color="#4ade80" bold>
          💵 ${u.usd.toFixed(2)}
        </Text>,
      )
    }

    if (t.activeMs > 0) {
      segs.push(
        <Text key="time">
          <Text>🕒 </Text>
          <Text dimColor>{fmtDur(t.activeMs)}</Text>
        </Text>,
      )
    }

    if (segs.length === 0) {
      return next(e)
    }

    return (
      <Box columnGap={1}>
        {segs}
      </Box>
    )
  })
}
