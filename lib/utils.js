import { asHex, getDiscoveryKey } from 'hexkey-utils'
import { DiGraph, BaseNode } from 'dcent-digraph'
import byteSize from 'tiny-byte-size'

export async function logRehostingInfo (rehoster, logger) {
  logger.info(getRehostingInfo(rehoster))

  if (logger.level === 'debug') {
    logger.debug(await getRehostingDetails(rehoster))
  }
}

function getSwarmInfo (swarm) {
  const dht = swarm.dht
  return {
    address: dht.host ? dht.host + ':' + dht.port : 'Loading',
    firewalled: dht.firewalled,
    'nat type': dht.port != null
      ? dht.port ? 'consistent' : 'random'
      : 'Loading',
    'public key': asHex(swarm.keyPair.publicKey),
    'nr connections': swarm.connections.size
  }
}

function getNodeInfo (node) {
  // TODO: remove when this is merged: https://github.com/holepunchto/hypercore/pull/378
  const getBytes = (core) => {
    return core.core?.tree
      ? core.core.tree.byteLength - (core.core.tree.length * core.padding)
      : 0
  }

  return {
    pubKey: asHex(node.pubKey),
    announcing: node.shouldAnnounce,
    discKey: getDiscoveryKey(node.pubKey),
    downloadedBlocks: `${node.core.contiguousLength} / ${node.core.length}`,
    nrPeers: node.core.peers.length,
    nrBytes: getBytes(node.core)
  }
}

function asDiGraph (rehoster) {
  class Node extends BaseNode {
    constructor (rehosterNode) {
      super(asHex(rehosterNode.pubKey))
      this.rehosterNode = rehosterNode
    }

    async getChildren () {
      const res = []
      for (const child of this.rehosterNode.children?.values() || []) {
        res.push(new Node(child))
      }

      // TODO: do in rehoster directly with utility method?
      const secCore = this.rehosterNode.secondaryCore
      if (secCore) res.push(new Node(secCore))

      return res
    }
  }

  return new DiGraph(new Node(rehoster.rootNode))
}

export function getRehostingInfo (rehoster) {
  const nrTotal = rehoster.keys.length
  const nrServed = rehoster.servedKeys.length

  let res = '\nRehoster\n'
  res += ` - public key: ${asHex(rehoster.ownKey)}\n`
  res += ` - rehosted cores: ${nrTotal} (announced: ${nrServed}) \n`

  res += 'Swarm\n'
  const swarmInfo = getSwarmInfo(rehoster.swarmManager.swarm)
  for (const [key, value] of Object.entries(swarmInfo)) {
    res += ` - ${key}: ${value}\n`
  }

  return res
}

export async function getRehostingDetails (rehoster) {
  const nodes = []
  const graph = asDiGraph(rehoster)
  for await (const node of graph.yieldAllNodesOnce()) {
    nodes.push(getNodeInfo(node.rehosterNode))
  }

  const infos = []
  for (const n of nodes) {
    infos.push(
      ` - ${n.pubKey} -- ${n.announcing ? 'announcing' : '/'} -- ${byteSize(n.nrBytes)} -- ${n.downloadedBlocks} blocks -- ${n.nrPeers} peers`
    )
  }

  const res = [
    'Hosted cores',
    ...infos.sort()
  ].join('\n')

  return res
}
