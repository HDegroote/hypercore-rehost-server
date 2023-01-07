import setupRehoster from './lib/server.js'
import axios from 'axios'

const corestoreLoc = './my-store'

console.log('Setting up rehost server')
const server = await setupRehoster(corestoreLoc)

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

console.log('Sync the keys-db with the swarm (can take a while)')
await axios.put(`${url}sync`)

server.close()
