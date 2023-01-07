import setupRehostServer from './lib/server.js'
import axios from 'axios'
import Hyperswarm from 'hyperswarm'
import Corestore from 'corestore'
import Rehoster from 'hypercore-rehoster'

const corestoreLoc = './my-store'
const swarm = new Hyperswarm()
const corestore = new Corestore(corestoreLoc)
const rehoster = await Rehoster.initFrom({ corestore, swarm, doSync: false })

console.log('Setting up rehost server (announces all cores in the db, so can take a while)')
const server = await setupRehostServer(rehoster)

const url = `http://localhost:${server.address().port}/`
const initKeys = (await axios.get(url)).data
if (initKeys.length > 0) {
  console.log(`Initial keys:\n\t-${initKeys.join('\n\t-')}`)
}

console.log('Add a key')
const discoveryKey = 'b'.repeat(64)
await axios.put(`${url}${discoveryKey}`)

const nowKeys = (await axios.get(url)).data
if (nowKeys.length > 0) {
  console.log(`Now keys:\n\t-${nowKeys.join('\n\t-')}`)
}

console.log('Sync the keys-db with the swarm')
await axios.put(`${url}sync`)

server.close()
await rehoster.close()
