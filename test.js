import { expect } from 'chai'
import ram from 'random-access-memory'
import axios from 'axios'
import createTestnet from '@hyperswarm/testnet'
import Hyperswarm from 'hyperswarm'
import Corestore from 'corestore'
import Rehoster from 'hypercore-rehoster'
import setupRehostServer from './lib/server.js'
import SwarmManager from 'swarm-manager'
import safetyCatch from 'safety-catch'

describe('Rehost server tests', function () {
  let server
  let testnet, swarm, swarmManager
  let url
  let rehoster
  const key = 'a'.repeat(64)

  this.beforeEach(async function () {
    testnet = await createTestnet(3)
    const bootstrap = testnet.bootstrap
    swarm = new Hyperswarm({ bootstrap })

    const corestore = new Corestore(ram)
    swarmManager = new SwarmManager(swarm)
    swarm.on('connection', socket => {
      corestore.replicate(socket)
      corestore.on('error', safetyCatch)
    })

    rehoster = new Rehoster(corestore, swarmManager)
    server = await setupRehostServer(rehoster)
    url = `http://localhost:${server.address().port}/`
  })

  this.afterEach(async function () {
    await new Promise(resolve => server.close(() => resolve()))

    await rehoster.close()
    await swarmManager.close()
    await testnet.destroy()
  })

  it('Can put key with info', async function () {
    const putRes = await axios.put(`${url}${key}`, { info: 'A key' })
    expect(putRes.status).to.equal(200)

    const getRes = await axios.get(url)
    expect(getRes.status).to.equal(200)
    expect(getRes.data).to.deep.equal([{
      key, info: 'A key'
    }])
  })

  it('can use the api', async function () {
    let res = await axios.get(url)
    expect(res.status).to.equal(200)
    expect(res.data).to.deep.equal([])

    res = await axios.put(`${url}${key}`)
    expect(res.status).to.equal(200)

    res = await axios.get(url)
    expect(res.status).to.equal(200)
    expect(res.data).to.deep.equal([{ key }])

    res = await axios.delete(`${url}${key}`)
    expect(res.status).to.equal(204)

    // Note: not usually necessary to wait
    // but saw it fail once
    await new Promise((resolve) => setTimeout(resolve, 100))

    res = await axios.get(url)
    expect(res.status).to.equal(200)
    expect(res.data).to.deep.equal([])

    res = await axios.get(`${url}info`)
    expect(res.status).to.equal(200)
    expect(Object.keys(res.data)).to.deep.have.same.members(['info', 'details'])
  })
})
