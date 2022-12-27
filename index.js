
import Corestore from 'corestore'
import express from 'express'
import { validateKey } from 'hexkey-utils'
import Rehoster from 'hypercore-rehoster'
import Hyperswarm from 'hyperswarm'
import Signal from 'signal-promise'

export default async function setupRehoster (
  corestoreLoc,
  { host = undefined, port = undefined, beeName = 'rehoster-keyset', swarm = undefined } = {}
) {
  swarm ??= new Hyperswarm()
  const corestore = new Corestore(corestoreLoc)

  const rehoster = await Rehoster.initFrom(
    { beeName, corestore, swarm, doSync: false }
  )
  const app = express()

  const initSyncProm = rehoster.syncWithDb()

  app.put('/sync', async function (req, res) {
    await rehoster.syncWithDb()
    res.sendStatus(200)
  })

  app.put('/:hexKey', async function (req, res) {
    const { hexKey } = req.params
    try {
      validateKey(hexKey)
    } catch (error) {
      console.log('Bad request for key', hexKey, error.message)
      res.status(400).send({ message: error.message })
      return res
    }

    await rehoster.addCore(hexKey, { doSync: false })
    console.log(`${new Date().toISOString()}--Added key:${hexKey}`)

    res.sendStatus(200)
  })

  app.get('/', async function (req, res) {
    res.json(Array.from(await rehoster.dbInterface.getHexKeys()))
  })

  const listener = app.listen(port, host)
  listener.on('close', async () => {
    console.log('closing rehoster')
    await rehoster.close()
    console.log('Closed rehoster')
  })

  const sig = new Signal()
  listener.on(
    'listening',
    () => {
      const address = listener.address()
      console.log(`Rehoster listening on ${address.address} on port ${address.port}`)
      sig.notify()
    }
  )
  await Promise.all([sig.wait(), initSyncProm])
  console.log('Synced db with rehoster (init sync)')

  return listener
}
