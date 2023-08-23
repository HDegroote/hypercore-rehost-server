import fastify from 'fastify'
import { validateKey } from 'hexkey-utils'
import promClient from 'prom-client'
import InstrumentedSwarm from 'instrumented-swarm'

import defineOwnMetrics from './metrics.js'
import {
  getRehostingDetails,
  getRehostingInfo,
  logRehostingInfo
} from './utils.js'

async function setupMetricsEndpoint (server, rehoster) {
  promClient.collectDefaultMetrics()
  const instrumentedSwarm = new InstrumentedSwarm(rehoster.swarm, { server })
  defineOwnMetrics(promClient, rehoster)

  // only relevant for tests, so the register can be cleared
  server._promClientRegister = promClient.register

  server.get('/metrics', { logLevel: 'warn' }, async function (req, reply) {
    const promMetrics = await promClient.register.metrics()
    const swarmMetrics = instrumentedSwarm.getPrometheusMetrics()
    reply.send(promMetrics + swarmMetrics)
  })
}

export default async function setupRehostServer (
  rehoster,
  {
    host = '127.0.0.1',
    port = 0,
    logger = true
  } = {}
) {
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

  await setupMetricsEndpoint(app, rehoster)

  logger.info('Setting up rehoster')
  const setupProm = rehoster.ready()
  const serverReady = app.listen({ port, host })

  // Not strictly needed, but already defines its port
  const dhtReadyProm = rehoster.swarm.dht.ready()

  await Promise.all([setupProm, serverReady, dhtReadyProm])

  const address = app.server.address()
  logger.info(`Rehoster listening on ${address.address}:${address.port}`)

  logRehostingInfo(rehoster, logger)

  return app
}
