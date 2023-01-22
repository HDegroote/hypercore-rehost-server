import { asHex } from 'hexkey-utils'

export function logRehostingInfo (rehoster, logger) {
  logger.info(getRehostingInfo(rehoster))

  if (logger.level === 'debug') {
    for (const info of getRehostingDetails(rehoster)) {
      logger.debug(info)
    }
  }
}

export function getRehostingInfo (rehoster) {
  const nrReplicated = rehoster.replicatedDiscoveryKeys.length - rehoster.servedDiscoveryKeys.length

  return `Nr announced (served) keys: ${rehoster.servedDiscoveryKeys.length} ` +
     `-- Nr replicated-but-not-announced keys: ${nrReplicated} ` +
     `-- Nr open connections: ${rehoster.swarmInterface.swarm.connections.size}`
}

export function getRehostingDetails (rehoster) {
  const servedKeys = [...rehoster.servedDiscoveryKeys].sort()
  const replicatedOnlyKeys = rehoster.replicatedDiscoveryKeys.filter(
    k => !rehoster.servedDiscoveryKeys.includes(k)
  ).sort()

  const res = []

  res.push(`Announced discovery keys: ${servedKeys.length}\n  - ${servedKeys.join('\n  - ')}`)
  res.push(`Replicated-only discovery keys: ${replicatedOnlyKeys.length}\n  - ${replicatedOnlyKeys.join('\n  - ')}`)

  const cores = Array.from(rehoster.corestore.cores.values())
  const publictoDiscKeys = cores
    .map(c => `${asHex(c.discoveryKey)} <-- ${asHex(c.key)} (length: ${c.length})`)
    .sort()
    .join('\n  - ')

  res.push(`Discovery keys <-- public keys in corestore: ${cores.length}\n  - ${publictoDiscKeys}`)

  return res
}
