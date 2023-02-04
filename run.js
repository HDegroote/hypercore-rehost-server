#! /usr/bin/env node

import loadConfig from './lib/config.js'
import setupLogger from 'pino'
import goodbye from 'graceful-goodbye'
import Corestore from 'corestore'
import Rehoster from 'hypercore-rehoster'
import Hyperswarm from 'hyperswarm'
import { asHex } from 'hexkey-utils'

import { logRehostingInfo } from './lib/utils.js'
import setupRehostServer from './lib/server.js'

async function main () {
  const config = loadConfig()
  const logger = setupLogger(
    { name: 'rehost-server', level: config.LOG_LEVEL }
  )

  const rehoster = await initRehoster(config, logger)

  const server = await setupRehostServer(rehoster, {
    host: config.HOST,
    port: config.PORT,
    logger
  })

  const minutesLogInterval = config.MIN_LOG_SUMMARY_INTERVAL
  if (minutesLogInterval) {
    setInterval(
      async () => {
        logRehostingInfo(rehoster, logger)
      }, minutesLogInterval * 60 * 1000
    )
  }

  goodbye(async () => {
    logger.info('Closing down rehoster and server')
    await Promise.all([rehoster.close(), server.close()])
    logger.info('Closed down successfully--exiting program')
  })
}

async function initRehoster (config, logger) {
  const corestore = new Corestore(config.CORESTORE_LOC)
  const swarm = setupSwarm(logger, corestore)

  const rehoster = new Rehoster(corestore, { beeName: config.BEE_NAME, swarm }
  )

  rehoster.on('invalidKey', ({ invalidKey, rehosterKey }) => {
    logger.warn(
      `Rehoster at key ${asHex(rehosterKey)}` +
      ` contains an invalid key: ${asHex(invalidKey)}--ignoring`
    )
  })

  return rehoster
}

function setupSwarm (logger, corestore) {
  const swarm = new Hyperswarm()

  swarm.on('connection', (socket, peerInfo) => {
    const key = asHex(peerInfo.publicKey)

    logger.info(`Connection opened with ${key}--total: ${swarm.connections.size}`)
    if (logger.level === 'debug' && peerInfo.topics && peerInfo.topics.length > 0) {
      const hexDiscKeys = peerInfo.topics.map(t => asHex(t)).sort()
      // Might be that the peerInfo topics are always known to us, in which case the check is redundant
      const keyMap = hexDiscKeys.map(
        k => `${k} <-- ${corestore.cores.get(k) ? asHex(corestore.cores.get(k).key) : 'Not known'}`
      )
      logger.debug(`Peer ${key} topics (disc key <-- pub key):\n  - ` +
        `${keyMap.join('\n  - ')}`)
    }

    socket.on('close', () => {
      logger.info(`Connection closed with ${key}--total: ${swarm.connections.size}`)
    })
  })

  return swarm
}

main()
