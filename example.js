import setupRehoster from './index.js'
import axios from 'axios'

const corestoreLoc = './my-store'

const server = await setupRehoster(corestoreLoc)
server.on('listening', () => console.log('Listening on', server.address()))

const url = 'http://localhost:50000/'

const initKeys = (await axios.get(url)).data
if (initKeys.length > 0) {
  console.log(`Initial keys:\n\t-${initKeys.join('\n\t-')}`)
}

const discoveryKey = 'b'.repeat(64)
await axios.put(`${url}${discoveryKey}`)

const nowKeys = (await axios.get(url)).data
if (nowKeys.length > 0) {
  console.log(`Now keys:\n\t-${nowKeys.join('\n\t-')}`)
}

server.close()
