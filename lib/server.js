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

  app.delete('/:hexKey', async function (req, res) {
    const { hexKey } = req.params
    try {
      validateKey(hexKey)
    } catch (error) {
      logger.info('Bad request for key', hexKey, error.message)
      res.status(400).send({ message: error.message })
      return res
    }

    await rehoster.removeCore(hexKey, { doSync: false })
    logger.info(`Removed key: ${hexKey}`)

    res.sendStatus(204)
  })

  logger.info('Syncing db with rehoster (init sync)')
  const initSyncProm = rehoster.syncWithDb()

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

  await Promise.all([sig.wait(), initSyncProm])
  logger.info('Init sync completed')

  logger.info(`Served discovery keys:\n  - ${rehoster.servedDiscoveryKeys.join('\n  - ')}`)
  logger.info(
    'Replicated-only discovery keys:\n  - ' +
    `${rehoster.replicatedDiscoveryKeys.filter(k => !rehoster.servedDiscoveryKeys.includes(k)).join('\n  - ')}`
  )
  logger.info(
    'Public keys in corestore:\n  - ' +
    `${Array.from(rehoster.hyperInterface.corestore.cores.keys()).join('\n  - ')}`
  )
  logRehostingInfo(rehoster, logger)

  return listener
}
