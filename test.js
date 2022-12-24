import { expect } from 'chai'
import ram from 'random-access-memory'
import axios from 'axios'
import createTestnet from '@hyperswarm/testnet'
import Hyperswarm from 'hyperswarm'

import setupServer from './index.js'

describe('Rehost server tests', function () {
  let server
  let testnet, swarm
  const port = 50584
  const url = `http://localhost:${port}/`
  const key = 'a'.repeat(64)

  this.beforeEach(async function () {
    testnet = await createTestnet(3)
    const bootstrap = testnet.bootstrap
    swarm = new Hyperswarm({ bootstrap })

    server = await setupServer(ram, { swarm, port })
  })

  this.afterEach(async function () {
    await swarm.destroy()
    await testnet.destroy()
    server.close()
  })

  it('Can put a new key', async function () {
    let res = await axios.get(url)
    expect(res.status).to.equal(200)
    expect(res.data).to.deep.equal([])

    await axios.put(`${url}${key}`)
    expect(res.status).to.equal(200)

    res = await axios.get(url)
    expect(res.status).to.equal(200)
    expect(res.data).to.deep.equal([key])

    res = await axios.put(`${url}sync`)
    expect(res.status).to.equal(200)
  })
})
