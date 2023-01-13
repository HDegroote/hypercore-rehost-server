import { asHex } from 'hexkey-utils'

export function logRehostingInfo (rehoster, logger) {
  const nrReplicated = rehoster.replicatedDiscoveryKeys.length - rehoster.servedDiscoveryKeys.length
  logger.info(
    `Nr announced (served) keys: ${rehoster.servedDiscoveryKeys.length} ` +
     `-- Nr replicated-but-not-announced keys: ${nrReplicated} ` +
     `-- Nr open connections: ${rehoster.swarmInterface.swarm.connections.size}`)

  if (logger.level === 'debug') {
    const servedKeys = [...rehoster.servedDiscoveryKeys].sort()
    const replicatedOnlyKeys = rehoster.replicatedDiscoveryKeys.filter(
      k => !rehoster.servedDiscoveryKeys.includes(k)
    ).sort()

    logger.debug(`Announced keys:\n  - ${servedKeys.join('\n  - ')}`)
    logger.debug(`Replicated-only discovery keys:\n  - ${replicatedOnlyKeys.join('\n  - ')}`)

    const publictoDiscKeys = Array.from(rehoster.hyperInterface.corestore.cores.values())
      .map(c => `${asHex(c.discoveryKey)} <-- ${asHex(c.key)} (length: ${c.length})`)
      .sort()
      .join('\n  - ')
    logger.debug(`Disc key <-- public keys in corestore:\n  - ${publictoDiscKeys}`)
  }
}
