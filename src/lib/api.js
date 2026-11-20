import { hasSupabase, supaApi } from './supa'
import { mockApi } from './mock'

export const forceDemo = typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo')
export const api = hasSupabase && !forceDemo ? supaApi : mockApi
export const isDemo = api.mode === 'demo'
