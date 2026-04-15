import { SimplePool } from 'nostr-tools/pool'
import * as nip19 from 'nostr-tools/nip19'

const SOURCE_TEMPLATES = [
  {
    label: 'Old',
    npub: 'npub1equrmqway3qxw3dkssymusxkwgwrqypfgeqx0lx9pgjam7gnj4ysaqhkj6'
  },
  {
    label: 'New',
    npub: 'npub1000000k94d2xgnfdyqkvvgmc4x2d798y67k2llk4szq7jarqhz2s540a03'
  }
]

const SOURCE_NPUBS = SOURCE_TEMPLATES.map((item) => item.npub)

const DEFAULT_RELAYS = [
  'wss://relay.ditto.pub',
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol'
]

const toSiteTitle = (event) => {
  const titleTag = (event.tags || []).find((tag) => tag[0] === 'title')
  if (titleTag?.[1]) return titleTag[1]

  const dTag = (event.tags || []).find((tag) => tag[0] === 'd')
  if (dTag?.[1]) return dTag[1]

  return 'Unnamed Nsite'
}

const toSiteKey = (event) => {
  const dTag = (event.tags || []).find((tag) => tag[0] === 'd')
  return `${event.pubkey}:${dTag?.[1] || 'root'}`
}

const shortNpub = (npub) => {
  return `${npub.slice(0, 12)}...${npub.slice(-6)}`
}

const toProfileName = (metadata, npub) => {
  if (metadata?.name) return metadata.name
  if (metadata?.display_name) return metadata.display_name
  return shortNpub(npub)
}

const toProfileMap = async ({ pool, relays, pubkeys }) => {
  if (!pubkeys.length) return new Map()

  const profileEvents = await pool.querySync(relays, {
    kinds: [0],
    authors: pubkeys,
    limit: Math.max(pubkeys.length * 2, 50)
  })

  const latestByPubkey = new Map()

  for (const event of profileEvents) {
    const previous = latestByPubkey.get(event.pubkey)
    if (!previous || event.created_at > previous.created_at) latestByPubkey.set(event.pubkey, event)
  }

  const profileMap = new Map()
  for (const [pubkey, event] of latestByPubkey.entries()) {
    try {
      const metadata = JSON.parse(event.content || '{}')
      profileMap.set(pubkey, {
        name: metadata.display_name || metadata.name || '',
        picture: typeof metadata.picture === 'string' ? metadata.picture : ''
      })
    } catch {
      profileMap.set(pubkey, {
        name: '',
        picture: ''
      })
    }
  }

  return profileMap
}

export const useNsiteExplore = () => {
  const pool = new SimplePool()
  const sourceByPubkey = new Map(
    SOURCE_TEMPLATES.map((item) => [nip19.decode(item.npub).data, item])
  )

  const sourceMatchForEvent = (event) => {
    const tags = event.tags || []
    for (const tag of tags) {
      if (!['muse', 'thief'].includes(tag[0])) continue
      for (const cell of tag) {
        const source = sourceByPubkey.get(String(cell).toLowerCase())
        if (source) return source
      }
    }
    return null
  }

  const fetchTemplateSites = async (limit = 1000, relays = DEFAULT_RELAYS) => {
    const events = await pool.querySync(relays, {
      kinds: [15128, 35128],
      limit
    })

    const related = events
      .filter((event) => sourceMatchForEvent(event) !== null)
      .filter((event) => event.kind === 15128)

    const deduped = new Map()
    for (const event of related) {
      const key = toSiteKey(event)
      const previous = deduped.get(key)
      if (!previous || event.created_at > previous.created_at) deduped.set(key, event)
    }

    const dedupedEvents = Array.from(deduped.values())
    const uniquePubkeys = Array.from(new Set(dedupedEvents.map((event) => event.pubkey)))
    const profileMap = await toProfileMap({
      pool,
      relays,
      pubkeys: uniquePubkeys
    })

    return dedupedEvents
      .sort((a, b) => b.created_at - a.created_at)
      .map((event) => {
        const npub = nip19.npubEncode(event.pubkey)
        const profile = profileMap.get(event.pubkey) || {}
        return {
          id: event.id,
          pubkey: event.pubkey,
          npub,
          npubShort: shortNpub(npub),
          sourceLabel: sourceMatchForEvent(event)?.label || '',
          title: toSiteTitle(event),
          profileName: toProfileName(profile, npub),
          profileImage: profile.picture || '',
          kind: event.kind,
          createdAt: event.created_at,
          nsiteCloudUrl: `https://${npub}.nsite.cloud`,
          nsiteRunUrl: `https://${npub}.nsite.run`,
          nsiteLolUrl: `https://${npub}.nsite.lol`,
          nsiteBoutiqueUrl: `https://${npub}.nsite.boutique`,
          nostoReUrl: `https://${npub}.nosto.re`,
          sovBizUrl: `https://${npub}.sov.biz`,
          sovPubUrl: `https://${npub}.sov.pub`
        }
      })
  }

  return {
    sourceNpubs: SOURCE_NPUBS,
    defaultRelays: DEFAULT_RELAYS,
    fetchTemplateSites
  }
}
