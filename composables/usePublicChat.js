import { generateSecretKey, getPublicKey } from 'nostr-tools/pure'
import * as nip17 from 'nostr-tools/nip17'
import * as nip19 from 'nostr-tools/nip19'
import { SimplePool } from 'nostr-tools/pool'

const TARGET_NPUB = 'npub1f7fg0u3py6h55c52z2a53e3yscmez6cxcvg24vgaxdna6ag2r8gq7d35sy'
const SESSION_KEY = 'clara-chat-ephemeral-secret-hex'
const FIRST_DM_PREFIX = 'clara-chat-first-dm-sent:'
const FIRST_DM_CONTENT = 'website chat'
const CHAT_KIND = 14
const INITIAL_SYNC_WINDOW = 60 * 60 * 24 * 7

const DEFAULT_RELAYS = [
  'wss://relay.ditto.pub',
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol'
]

const pool = new SimplePool()

const toHex = (bytes) => {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

const fromHex = (hex) => {
  if (!hex || typeof hex !== 'string' || hex.length % 2 !== 0) return null
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) out[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  return out
}

const decodeNpub = (npub) => {
  const decoded = nip19.decode(npub)
  if (decoded.type !== 'npub') throw new Error('Invalid target npub.')
  return decoded.data
}

const targetPubkey = decodeNpub(TARGET_NPUB)

const normalizedRelays = (relays = []) => {
  const merged = relays.length > 0 ? relays : DEFAULT_RELAYS
  return Array.from(new Set(merged.filter((relay) => typeof relay === 'string' && relay.startsWith('wss://'))))
}

const now = () => Math.floor(Date.now() / 1000)

const loadOrCreateSecretKey = () => {
  if (!process.client) return null

  const cachedHex = window.localStorage.getItem(SESSION_KEY)
  const cached = fromHex(cachedHex)
  if (cached && cached.length === 32) return cached

  const fresh = generateSecretKey()
  window.localStorage.setItem(SESSION_KEY, toHex(fresh))
  return fresh
}

const messageKey = (event) => `${event.id || ''}:${event.created_at || 0}:${event.pubkey || ''}`

const sortByTime = (events) => [...events].sort((a, b) => a.created_at - b.created_at)

const dedupeById = (events) => {
  const seen = new Set()
  const unique = []
  for (const event of events) {
    const id = event?.id
    if (!id || seen.has(id)) continue
    seen.add(id)
    unique.push(event)
  }
  return unique
}

const normalizeMessage = ({ pubkey, content, created_at, id }) => ({
  pubkey,
  content,
  created_at,
  id: id || `local-${created_at}-${Math.random().toString(36).slice(2, 10)}`
})

export const usePublicChat = (relays = DEFAULT_RELAYS) => {
  const relaySet = normalizedRelays(relays)

  const identity = ref(null)
  const messages = ref([])
  const isSending = ref(false)
  const isSyncing = ref(false)
  const error = ref('')
  const openedAt = ref(0)
  const lastSyncedAt = ref(0)

  const ensureIdentity = () => {
    if (!process.client) return null
    if (identity.value) return identity.value

    const secretKey = loadOrCreateSecretKey()
    if (!secretKey) return null

    const pubkey = getPublicKey(secretKey)
    identity.value = {
      secretKey,
      pubkey,
      npub: nip19.npubEncode(pubkey)
    }

    return identity.value
  }

  const mergeMessages = (incoming) => {
    const map = new Map()
    for (const event of messages.value) map.set(messageKey(event), event)
    for (const event of incoming) map.set(messageKey(event), event)
    messages.value = sortByTime(Array.from(map.values())).filter((event) => {
      return (event.content || '').trim().toLowerCase() !== FIRST_DM_CONTENT
    })
  }

  const decryptWrappedEvents = (wrappedEvents, me) => {
    const next = []
    for (const wrapped of wrappedEvents) {
      try {
        const dm = nip17.unwrapEvent(wrapped, me.secretKey)
        if (dm.kind !== CHAT_KIND) continue

        const pTags = (dm.tags || []).filter((tag) => tag[0] === 'p').map((tag) => tag[1])
        const hasTarget = pTags.includes(targetPubkey)
        const isFromTarget = dm.pubkey === targetPubkey
        const isFromMe = dm.pubkey === me.pubkey
        if (!isFromTarget && !isFromMe) continue
        if (isFromMe && !hasTarget) continue

        next.push(dm)
      } catch {
        // Skip wraps that do not decrypt for this key.
      }
    }
    return next
  }

  const ensureFirstDmHandshake = async (me) => {
    if (!process.client || !me) return

    const firstDmKey = `${FIRST_DM_PREFIX}${me.pubkey}`
    const sentFlag = window.localStorage.getItem(firstDmKey)
    if (sentFlag) return

    const wrappedEvents = nip17.wrapManyEvents(
      me.secretKey,
      [{ publicKey: targetPubkey }],
      FIRST_DM_CONTENT,
      'Clara chat'
    )

    await Promise.any(pool.publish(relaySet, wrappedEvents[0]))
    if (wrappedEvents[1]) await Promise.any(pool.publish(relaySet, wrappedEvents[1]))
    window.localStorage.setItem(firstDmKey, '1')
  }

  const syncNewMessages = async (options = {}) => {
    const { forceFull = false, silent = false } = options
    error.value = ''
    const me = ensureIdentity()
    if (!me) return

    if (!silent) isSyncing.value = true
    try {
      const currentTs = now()
      const since = forceFull
        ? Math.max(0, currentTs - INITIAL_SYNC_WINDOW)
        : (lastSyncedAt.value || Math.max(0, openedAt.value - 15) || currentTs - 60)

      const [inboundWrapped, outboundWrapped] = await Promise.all([
        pool.querySync(relaySet, {
          kinds: [1059],
          '#p': [me.pubkey],
          since,
          limit: 140
        }),
        pool.querySync(relaySet, {
          kinds: [1059],
          '#p': [targetPubkey],
          since,
          limit: 140
        })
      ])

      let wrapped = dedupeById([...inboundWrapped, ...outboundWrapped])
      if (wrapped.length === 0) {
        const fallbackWrapped = await pool.querySync(relaySet, {
          kinds: [1059],
          since,
          limit: 240
        })
        wrapped = fallbackWrapped
      }

      mergeMessages(decryptWrappedEvents(wrapped, me))
      lastSyncedAt.value = currentTs
    } catch (err) {
      error.value = err?.message || 'Could not sync encrypted messages.'
    } finally {
      if (!silent) isSyncing.value = false
    }
  }

  const startSession = async () => {
    const me = ensureIdentity()
    if (me && process.client) {
      try {
        await ensureFirstDmHandshake(me)
      } catch {
        // Silent by design; this is a hidden handshake message.
      }
    }

    if (!openedAt.value) openedAt.value = now()
    await syncNewMessages({ forceFull: true })
  }

  const sendMessage = async (content) => {
    const body = (content || '').trim()
    if (!body) return

    error.value = ''
    const me = ensureIdentity()
    if (!me) {
      error.value = 'Could not create ephemeral identity.'
      return
    }

    isSending.value = true
    try {
      await ensureFirstDmHandshake(me)

      const wrappedEvents = nip17.wrapManyEvents(
        me.secretKey,
        [{ publicKey: targetPubkey }],
        body,
        'Clara chat'
      )

      await Promise.any(pool.publish(relaySet, wrappedEvents[0]))
      if (wrappedEvents[1]) await Promise.any(pool.publish(relaySet, wrappedEvents[1]))

      mergeMessages([
        normalizeMessage({
          pubkey: me.pubkey,
          content: body,
          created_at: now()
        })
      ])
    } catch (err) {
      error.value = err?.message || 'Could not publish encrypted message to relays.'
      throw err
    } finally {
      isSending.value = false
    }
  }

  const clearIdentity = () => {
    if (!process.client) return
    window.localStorage.removeItem(SESSION_KEY)
    identity.value = null
    messages.value = []
    openedAt.value = 0
    lastSyncedAt.value = 0
  }

  return {
    targetNpub: TARGET_NPUB,
    targetPubkey,
    relays: relaySet,
    identity,
    messages,
    isSending,
    isSyncing,
    error,
    ensureIdentity,
    startSession,
    syncNewMessages,
    sendMessage,
    clearIdentity
  }
}
