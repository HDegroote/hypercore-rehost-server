
import Corestore from 'corestore'
import express from 'express'
import { validateKey } from 'hexkey-utils'
import Rehoster from 'hypercore-rehoster'
import Hyperswarm from 'hyperswarm'

export default async function setupRehoster (
  corestoreLoc,
  { host = 'localhost', port = 50000, beeName = 'rehoster-keyset', swarm = undefined } = {}
) {
  swarm ??= new Hyperswarm()
  const corestore = new Corestore(corestoreLoc)

  const rehoster = await Rehoster.initFrom({ beeName, corestore, swarm })
  await rehoster.ready()
  const app = express()

  app.put('/:hexKey', async function (req, res) {
    const { hexKey } = req.params
    try {
      validateKey(hexKey)
    } catch (error) {
      console.log('Bad request for key', hexKey, error.message)
      res.status(400).send({ message: error.message })
      return res
    }

    await rehoster.addCore(hexKey)
    console.log(`${new Date().toISOString()}--Added key:${hexKey}`)

    res.sendStatus(200)
  })

  app.get('/', async function (req, res) {
    res.json(Array.from(await rehoster.dbInterface.getHexKeys()))
  })

  const listener = app.listen(port, host)
  listener.on('close', () => {
    console.log('closing rehoster')
    rehoster.close()
  })

  return listener
}
