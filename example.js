import axios from 'axios'
import Corestore from 'corestore'
import Rehoster from 'hypercore-rehoster'

import setupRehostServer from './lib/server.js'

const corestoreLoc = './my-store'
const corestore = new Corestore(corestoreLoc)
const rehoster = new Rehoster(corestore)

console.log('Setting up rehost server')
const server = await setupRehostServer(rehoster)

const url = `http://localhost:${server.address().port}/`
const initKeys = (await axios.get(url)).data
console.log(`Initial keys:\n\t-${initKeys.join('\n\t-')}`)

console.log('\nAdd a key')
const publicKey = 'b'.repeat(64)
await axios.put(`${url}${publicKey}`)

const nowKeys = (await axios.get(url)).data
if (nowKeys.length > 0) {
  console.log(`Now keys:\n\t-${nowKeys.join('\n\t-')}`)
}

const { details } = (await axios.get(`${url}info`)).data
console.log('\n', details) // Includes your own core

console.log('\nRemove a key')
await axios.delete(`${url}${publicKey}`)

const finalKeys = (await axios.get(url)).data

console.log(`Final keys:\n\t-${finalKeys.join('\n\t-')}`)

server.close(
  async () => await rehoster.close()
)
