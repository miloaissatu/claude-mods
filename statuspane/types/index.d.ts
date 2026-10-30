export type Usage = {
  ctxPercent: number | null
  ctxTokens: number | null
  ctxWindow: number
  limits: { kind: string; percentUsed: number; resetsAt?: string }[]
  usd: number | null
}

export type Totals = {
  input: number
  output: number
  read: number
  write: number
  activeMs: number
  model: string
}

declare module 'claude-code' {
  interface PluginState {
    statuspane: { usage: Usage | null; totals: Shaped<Totals> }
  }
}
