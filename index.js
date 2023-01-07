#! /usr/bin/env node

import loadConfig from './lib/config.js'
import setupLogger from 'pino'
import goodbye from 'graceful-goodbye'
import Corestore from 'corestore'
import Rehoster from 'hypercore-rehoster'
import Hyperswarm from 'hyperswarm'
import { asHex } from 'hexkey-utils'

import setupRehostServer from './lib/server.js'

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
  let nrConnections = 0
  const swarm = new Hyperswarm()

  swarm.on('connection', (socket, peerInfo) => {
    nrConnections++
    const key = asHex(peerInfo.publicKey)

    logger.info(`Connection opened with ${key}--total: ${nrConnections}\n`)
    socket.on('close', () => {
      nrConnections--
      logger.info(`Connection closed with ${key}--total: ${nrConnections}`)
    })
  })

  return swarm
}

main()
