export type Usage = {
  ctxPercent: number | null
  ctxTokens: number | null
  ctxWindow: number
  limits: { kind: string; percentUsed: number; resetsAt?: string }[]
  usd: number | null
}

export type Totals = { input: number; read: number; write: number; activeMs: number }

declare module 'claude-code' {
  interface PluginState {
    statusband: { usage: Usage | null; totals: Totals }
  }
}
