import fsProm from 'fs/promises'
import path from 'path'

import fastify from 'fastify'
import { asHex, validateKey } from 'hexkey-utils'
import promClient from 'prom-client'
import InstrumentedSwarm from 'instrumented-swarm'
import InstrumentedCorestore from '@hdegroote/instrumented-corestore'

import defineOwnMetrics from './metrics.js'
import {
  getRehostingDetails,
  getRehostingInfo,
  logRehostingInfo
} from './utils.js'

async function setupMetricsEndpoint (server, rehoster, instrumentedSwarm, { detailedMetrics } = {}) {
  promClient.collectDefaultMetrics()
  defineOwnMetrics(promClient, rehoster)
  instrumentedSwarm.registerPrometheusMetrics(promClient)

  const getName = (key) => {
    // TODO: implement in hypercore-rehoster
    // return (await rehoster.getNode(key))?.info
    return asHex(key)
  }
  // TODO: consider function instead of class
  new InstrumentedCorestore( // eslint-disable-line no-new
    rehoster.corestore, promClient, getName, { detailed: detailedMetrics }
  )
  // only relevant for tests, so the register can be cleared
  server._promClientRegister = promClient.register

  server.get('/metrics', { logLevel: 'warn' }, async function (req, reply) {
    const metrics = await promClient.register.metrics()
    reply.send(metrics)
  })
}

async function applyStateFromConfig (rehoster, configPath) {
  const stateTxt = await fsProm.readFile(configPath)
  const newState = JSON.parse(stateTxt)
  await rehoster.sync(newState)
}

export default async function setupRehostServer (
  rehoster,
  {
    host = '127.0.0.1',
    port = 0,
    logger = true,
    exposeSwarm = false,
    configPath,
    detailedMetrics = false

  } = {}
) {
  configPath = configPath ? path.resolve(configPath) : null

  const app = fastify({ logger })
  logger = app.log

  app.addHook('onClose', async () => {
    logger.info('closing rehoster')
    await rehoster.close()
    logger.info('closed rehoster')
  })

  app.put('/:hexKey', async function (req, res) {
    const { hexKey } = req.params

    const info = req.body.info
    try {
      validateKey(hexKey)
    } catch (error) {
      logger.info('Bad request for key', hexKey, error.message)
      res.status(400).send({ message: error.message })
      return res
    }

    await rehoster.add(hexKey, { info })
    logger.info(`Added key: ${hexKey}`)

    res.status(200)
  })

  app.get('/', async function (req, res) {
    const entries = []
    for await (const entry of rehoster.dbInterface.getKeyInfoStream()) {
      entries.push(entry)
    }

    res.send(entries)
  })

  app.get('/info', async function (req, res, next) {
    res.send({
      info: getRehostingInfo(rehoster),
      details: await getRehostingDetails(rehoster)
    })
  })

  app.delete('/:hexKey', async function (req, res, next) {
    const { hexKey } = req.params
    try {
      validateKey(hexKey)
    } catch (error) {
      logger.info('Bad request for key', hexKey, error.message)
      res.status(400).send({ message: error.message })
      return res
    }

    await rehoster.delete(hexKey)
    logger.info(`Removed key: ${hexKey}`)

    res.status(204)
  })

  app.get('/health', { logLevel: 'warn' }, function (req, res) {
    res.send('Healthy')
  })

  app.post('/sync', async function (req, res) {
    if (!configPath) {
      res.status(400).send('No config path was specified during server startup')
      return
    }

    try {
      await applyStateFromConfig(rehoster, configPath)
    } catch (e) {
      logger.error(e)
      res.status(400).send(`Could not apply the config at ${configPath}`)
      return
    }

    res.status(200).send(`Rehoster updated to new state at ${configPath}`)
  })

  const instrumentOpts = {}
  if (exposeSwarm) instrumentOpts.server = app

  const instrumentedSwarm = new InstrumentedSwarm(rehoster.swarm, instrumentOpts)
  await setupMetricsEndpoint(app, rehoster, instrumentedSwarm, { detailedMetrics })

  logger.info('Setting up rehoster')
  const setupProm = rehoster.ready()
  if (configPath) {
    logger.info(`Applying the initial key state from ${configPath}`)
    await applyStateFromConfig(rehoster, configPath)
  }

  const serverReady = app.listen({ port, host })

  // Not strictly needed, but already defines its port
  const dhtReadyProm = rehoster.swarm.dht.ready()

  await Promise.all([setupProm, serverReady, dhtReadyProm])

  const address = app.server.address()
  logger.info(`Rehoster listening on ${address.address}:${address.port}`)

  logRehostingInfo(rehoster, logger)

  return app
}
