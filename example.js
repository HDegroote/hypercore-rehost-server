import axios from 'axios'
import Corestore from 'corestore'
import Rehoster from 'hypercore-rehoster'
import Hyperswarm from 'hyperswarm'
import SwarmManager from 'swarm-manager'

import setupRehostServer from './lib/server.js'

const corestoreLoc = './my-store'
const corestore = new Corestore(corestoreLoc)
const rehoster = getRehoster(corestore, new Hyperswarm())

console.log('Setting up rehost server')
const host = '127.0.0.1'
const app = await setupRehostServer(rehoster, { logger: false, host })
const server = app.server
const url = `http://${host}:${server.address().port}/`

console.log('initial keys:')
await printKeys(url)

console.log('\nAdd a key')
const publicKey = 'b'.repeat(64)
await axios.put(`${url}${publicKey}`, { info: 'Rehosts my documents' })

console.log('now keys:')
await printKeys(url)

const { details } = (await axios.get(`${url}info`)).data
console.log('\n', details) // Includes your own core

console.log('\nRemove a key')
await axios.delete(`${url}${publicKey}`)

console.log('Final keys:')
await printKeys(url)

server.close(
  async () => await Promise.all([rehoster.close(), rehoster.swarmManager.close()])
)

async function printKeys (url) {
  const entries = (await axios.get(url)).data

  if (entries.length === 0) console.log('<No entries>')
  for (const entry of entries) {
    console.log(`  -${entry.key} (${entry.info || ''})`)
  }
}

function getRehoster (store, swarm) {
  swarm.on('connection', (socket) => {
    store.replicate(socket)
    socket.on('error', () => {})
  })

  const swarmManager = new SwarmManager(swarm)
  return new Rehoster(
    store.namespace('rehoster'),
    swarmManager
  )
}
