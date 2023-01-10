#! /usr/bin/env node

import { fileURLToPath } from 'url'
import loadConfig from './lib/config.js'
import setupLogger from 'pino'
import goodbye from 'graceful-goodbye'
import Corestore from 'corestore'
import Rehoster from 'hypercore-rehoster'
import Hyperswarm from 'hyperswarm'
import { asHex } from 'hexkey-utils'

import setupRehostServer from './lib/server.js'
import { logRehostingInfo } from './lib/utils.js'

async function main () {
  const config = loadConfig()
  const logger = setupLogger(
    { name: 'rehost-server', level: config.LOG_LEVEL }
  )

  const rehoster = await setupRehoster(config, logger)
  const server = await setupRehostServer(rehoster, {
    host: config.HOST,
    port: config.PORT,
    logger
  })

  const hoursSyncInterval = config.HOURS_SYNC_INTERVAL
  if (hoursSyncInterval) {
    setInterval(
      async () => {
        logger.info(`Starting scheduled sync with db (running every ${hoursSyncInterval} hours)`)
        await rehoster.syncWithDb
        logger.info('Finished scheduled sync with db')
        logRehostingInfo(rehoster, logger)
      }, hoursSyncInterval * 60 * 60 * 1000
    )
    logger.info(`Set up an automatic sync which will run once every ${hoursSyncInterval} hours`)
  } else {
    logger.info('Not setting up any automatic sync')
  }

  goodbye(async () => {
    logger.info('Closing down rehoster and server')
    await Promise.all([rehoster.close(), server.close()])
    logger.info('Closed down successfully--exiting program')
  })
}

async function setupRehoster (config, logger) {
  const corestore = new Corestore(config.CORESTORE_LOC)
  const swarm = setupSwarm(logger)

  return await Rehoster.initFrom(
    { beeName: config.BEE_NAME, corestore, swarm, doSync: false }
  )
}

function setupSwarm (logger) {
  const swarm = new Hyperswarm()

  swarm.on('connection', (socket, peerInfo) => {
    const key = asHex(peerInfo.publicKey)

    logger.info(`Connection opened with ${key}--total: ${swarm.connections.size}`)
    socket.on('close', () => {
      logger.info(`Connection closed with ${key}--total: ${swarm.connections.size}`)
    })
  })

  return swarm
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}

export default setupRehostServer
