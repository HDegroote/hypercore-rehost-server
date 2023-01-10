export function logRehostingInfo (rehoster, logger) {
  const nrReplicated = rehoster.replicatedDiscoveryKeys.length - rehoster.servedDiscoveryKeys.length
  logger.info(
    `Nr announced (served) keys: ${rehoster.servedDiscoveryKeys.length} ` +
     `-- Nr replicated-but-not-announced keys: ${nrReplicated} ` +
     `-- Nr open connections: ${rehoster.swarmInterface.swarm.connections.size}`)
}
