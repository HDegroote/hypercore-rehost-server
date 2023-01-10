import express from 'express'
import { validateKey, asHex } from 'hexkey-utils'
import Signal from 'signal-promise'

import { logRehostingInfo } from './utils.js'

export default async function setupRehostServer (
  rehoster,
  {
    host = undefined,
    port = undefined,
    logger = console
  } = {}
) {
  logger.info(`Own rehoster public key: ${asHex(rehoster.ownKey)}`)
  const app = express()

  const initSyncProm = rehoster.syncWithDb()

  app.put('/sync', async function (req, res) {
    logger.info('Starting sync')
    await rehoster.syncWithDb()
    logger.info('Synced')

    logRehostingInfo(rehoster, logger)

    res.sendStatus(200)
  })

  app.put('/:hexKey', async function (req, res) {
    const { hexKey } = req.params
    try {
      validateKey(hexKey)
    } catch (error) {
      logger.info('Bad request for key', hexKey, error.message)
      res.status(400).send({ message: error.message })
      return res
    }

    await rehoster.addCore(hexKey, { doSync: false })
    logger.info(`Added key: ${hexKey}`)

    res.sendStatus(200)
  })

  app.get('/', async function (req, res) {
    res.json(Array.from(await rehoster.dbInterface.getHexKeys()))
  })

  const listener = app.listen(port, host)

  const sig = new Signal()
  listener.on(
    'listening',
    () => {
      const address = listener.address()
      logger.info(`Rehoster listening on ${address.address} on port ${address.port}`)
      sig.notify()
    }
  )

  logger.info('Syncing db with rehoster (init sync)')
  await Promise.all([sig.wait(), initSyncProm])
  logger.info('Init sync completed')

  logRehostingInfo(rehoster, logger)
  logger.info(`Served discovery keys:\n  - ${rehoster.servedDiscoveryKeys.join('\n  - ')}`)

  return listener
}
