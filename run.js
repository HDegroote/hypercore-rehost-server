#! /usr/bin/env node

import loadConfig from './lib/config.js'
import setupLogger from 'pino'
import goodbye from 'graceful-goodbye'
import Corestore from 'corestore'
import Rehoster from 'hypercore-rehoster'
import Hyperswarm from 'hyperswarm'
import { asHex } from 'hexkey-utils'
import DHT from 'hyperdht'
import SwarmManager from 'swarm-manager'

import { logRehostingInfo } from './lib/utils.js'
import setupRehostServer from './lib/server.js'

async function main () {
  const config = loadConfig()
  const logger = setupLogger(
    { name: 'rehost-server', level: config.LOG_LEVEL }
  )

  const configEntries = []
  for (const [key, value] of Object.entries(config)) {
    configEntries.push(`${key}: ${value}`)
  }
  logger.info(`Using config:\n -${configEntries.join('\n- ')}`)

  const rehoster = await initRehoster(config, logger)

  const server = await setupRehostServer(rehoster, {
    host: config.HOST,
    port: config.PORT,
    exposeSwarm: config.EXPOSE_SWARM,
    logger
  })

  const minutesLogInterval = config.MIN_LOG_SUMMARY_INTERVAL
  if (minutesLogInterval) {
    setInterval(
      async () => {
        await logRehostingInfo(rehoster, logger)
      }, minutesLogInterval * 60 * 1000
    )
  }

  goodbye(async () => {
    logger.info('Closing down server')
    await server.close()
    logger.info('Closed server down successfully--exiting program')
  })
}

async function initRehoster (config, logger) {
  const corestore = new Corestore(config.CORESTORE_LOC)
  const swarm = setupSwarm(logger, corestore, config.SWARM_PORT)
  const manager = new SwarmManager(swarm)

  const rehoster = new Rehoster(corestore, manager, { beeName: config.BEE_NAME }
  )

  rehoster.on('invalidKey', ({ invalidKey, rehosterKey }) => {
    logger.warn(
      `Rehoster at key ${asHex(rehosterKey)}` +
      ` contains an invalid key: ${asHex(invalidKey)}--ignoring`
    )
  })

  return rehoster
}

function setupSwarm (logger, corestore, port) {
  const dht = new DHT({ port })
  const swarm = new Hyperswarm({ dht })

  swarm.on('connection', (socket, peerInfo) => {
    corestore.replicate(socket)
    socket.on('error', e => logger.info(e)) // Usually just unexpectedly closed

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
