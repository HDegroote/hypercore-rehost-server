import { expect } from 'chai'
import ram from 'random-access-memory'
import axios from 'axios'
import createTestnet from '@hyperswarm/testnet'
import Hyperswarm from 'hyperswarm'
import Corestore from 'corestore'
import Rehoster from 'hypercore-rehoster'
import { asHex } from 'hexkey-utils'
import setupRehostServer from './lib/server.js'

describe('Rehost server tests', function () {
  let server
  let testnet, swarm
  let url
  let rehoster
  const key = 'a'.repeat(64)

  this.beforeEach(async function () {
    testnet = await createTestnet(3)
    const bootstrap = testnet.bootstrap
    swarm = new Hyperswarm({ bootstrap })

    const corestore = new Corestore(ram)

    rehoster = new Rehoster(corestore, { swarm })
    server = await setupRehostServer(rehoster)
    url = `http://localhost:${server.address().port}/`
  })

  this.afterEach(async function () {
    await swarm.destroy()
    await testnet.destroy()

    await server.close()
  })

  it('can use the api', async function () {
    let res = await axios.get(url)
    expect(res.status).to.equal(200)
    expect(res.data).to.deep.equal([])

    await axios.put(`${url}${key}`)
    expect(res.status).to.equal(200)

    res = await axios.get(url)
    expect(res.status).to.equal(200)
    expect(res.data).to.deep.equal([key])

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
    expect(res.data.info).to.equal(
      `Nr announced (served) keys: 1\nNr replicated-but-not-announced keys: 0\nNr open connections: 0\nOwn rehoster public key: ${asHex(rehoster.ownKey)}`
    )
  })
})
