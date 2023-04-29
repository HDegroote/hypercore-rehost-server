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

  app.put('/:hexKey', async function (req, res) {
    const { hexKey } = req.params
    try {
      validateKey(hexKey)
    } catch (error) {
      logger.info('Bad request for key', hexKey, error.message)
      res.status(400).send({ message: error.message })
      return res
    }

    await rehoster.add(hexKey)
    logger.info(`Added key: ${hexKey}`)

    res.sendStatus(200)
  })

  app.get('/', async function (req, res) {
    res.json(Array.from(await rehoster.dbInterface.getHexKeys()))
  })

  app.get('/info', async function (req, res) {
    res.json({
      info: getRehostingInfo(rehoster),
      details: await getRehostingDetails(rehoster)
    })
  })

  app.delete('/:hexKey', async function (req, res) {
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
