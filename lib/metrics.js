import { collectNodes, collectRawNodes, getNrConnections } from './utils.js'

async function getNrCoresWithoutPeers (rehoster) {
  const nodes = await collectNodes(rehoster)
  const res = nodes.filter(n => n.nrPeers === 0).length

  return res
}

async function getNrIncompleteCores (rehoster) {
  const nodes = await collectRawNodes(rehoster)
  const res = nodes.filter(
    n => n.core.contiguousLength !== n.core.length
  ).length

  return res
}

async function getTotalCores (rehoster) {
  const nodes = await collectNodes(rehoster)
  return nodes.length
}

async function getTotalBytes (rehoster) {
  const nodes = await collectNodes(rehoster)
  const res = nodes.reduce(
    (byteSum, node) => byteSum + node.nrBytes,
    0
  )

  return res
}

export default function defineOwnMetrics (metricsClient, rehoster) {
  new metricsClient.Gauge({ // eslint-disable-line no-new
    name: 'rehoster_nr_connections',
    help: 'Amount of open connections to other peers',
    collect () {
      this.set(getNrConnections(rehoster.swarm))
    }
  })

  new metricsClient.Gauge({ // eslint-disable-line no-new
    name: 'rehoster_total_bytes',
    help: 'Bytes needed to host all entries',
    async collect () {
      this.set(await getTotalBytes(rehoster))
    }
  })

  new metricsClient.Gauge({ // eslint-disable-line no-new
    name: 'rehoster_nr_incomplete_cores',
    help: 'Amount of cores which are not fully downloaded',
    async collect () {
      this.set(await getNrIncompleteCores(rehoster))
    }
  })

  new metricsClient.Gauge({ // eslint-disable-line no-new
    name: 'rehoster_total_cores',
    help: 'Total amount of rehosted cores',
    async collect () {
      this.set(await getTotalCores(rehoster))
    }
  })

  new metricsClient.Gauge({ // eslint-disable-line no-new
    name: 'rehoster_cores_without_peers',
    help: 'Amount of cores who have no other peers',
    async collect () {
      this.set(await getNrCoresWithoutPeers(rehoster))
    }
  })
}
