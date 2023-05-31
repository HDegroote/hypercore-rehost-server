import express from 'express'
import { validateKey } from 'hexkey-utils'

import { getRehostingDetails, getRehostingInfo, logRehostingInfo } from './utils.js'

export default async function setupRehostServer (
  rehoster,
  {
    host = undefined,
    port = undefined,
    logger = console
  } = {}
) {
  const app = express()
  app.use(express.json())

  app.put('/:hexKey', async function (req, res, next) {
    try {
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

      res.sendStatus(200)
    } catch (e) {
      next(e)
    }
  })

  app.get('/', async function (req, res, next) {
    try {
      const entries = []
      for await (const entry of rehoster.dbInterface.getKeyInfoStream()) {
        entries.push(entry)
      }

      res.json(entries)
    } catch (e) {
      next(e)
    }
  })

  app.get('/info', async function (req, res, next) {
    try {
      res.json({
        info: getRehostingInfo(rehoster),
        details: await getRehostingDetails(rehoster)
      })
    } catch (e) {
      next(e)
    }
  })

  app.delete('/:hexKey', async function (req, res, next) {
    try {
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

      res.sendStatus(204)
    } catch (e) {
      next(e)
    }
  })

  logger.info('Setting up rehoster')
  const setupProm = rehoster.ready()

  const listener = app.listen(port, host)

  const serverReadyProm = new Promise((resolve) => {
    listener.on(
      'listening',
      () => {
        const address = listener.address()
        logger.info(`Rehoster listening on ${address.address} on port ${address.port}`)
        resolve()
      }
    )
  })

  await Promise.all([serverReadyProm, setupProm])
  logger.info('Setup completed')
  logRehostingInfo(rehoster, logger)

  return listener
}
