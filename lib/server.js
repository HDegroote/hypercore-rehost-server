import fastify from 'fastify'
import { validateKey } from 'hexkey-utils'

import defineOwnMetrics from './metrics.js'
import {
  getRehostingDetails,
  getRehostingInfo,
  logRehostingInfo
} from './utils.js'
import metricsPlugin from 'fastify-metrics'

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

  await app.register(metricsPlugin, {
    endpoint: '/metrics',
    routeMetrics: {
      routeBlacklist: ['/health', '/metrics']
    }
  })

  logger.info('Setting up rehoster')
  const setupProm = rehoster.ready()
  const serverReady = app.listen({ port, host })

  await Promise.all([setupProm, serverReady])

  defineOwnMetrics(app.metrics.client, rehoster)

  const address = app.server.address()
  logger.info(`Rehoster listening on ${address.address}:${address.port}`)

  logRehostingInfo(rehoster, logger)

  return app
}
