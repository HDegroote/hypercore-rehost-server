import os from 'os'
import fsProm from 'fs/promises'
import path from 'path'

import { expect } from 'chai'
import ram from 'random-access-memory'
import axios from 'axios'
import createTestnet from 'hyperdht/testnet.js'
import Hyperswarm from 'hyperswarm'
import Corestore from 'corestore'
import Rehoster from 'hypercore-rehoster'
import setupRehostServer from './lib/server.js'
import SwarmManager from 'swarm-manager'
import safetyCatch from 'safety-catch'

describe('Rehost server tests', function () {
  let app
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
  })

  this.afterEach(async function () {
    if (app) await app.close()

    // Need to clear the metrics, because without clearing
    // the server crashes on the second test, attempting
    // to re-register the metrics
    app._promClientRegister.clear()
    await swarmManager.close()
    await testnet.destroy()
  })

  it('Can put key with info', async function () {
    app = await setupRehostServer(rehoster, { logger: false, host: '127.0.0.1' })
    url = `http://127.0.0.1:${app.server.address().port}/`

    const putRes = await axios.put(`${url}${key}`, { info: 'A key' })
    expect(putRes.status).to.equal(200)

    const getRes = await axios.get(url)
    expect(getRes.status).to.equal(200)
    expect(getRes.data).to.deep.equal([{
      key, info: 'A key'
    }])
  })

  it('can use the api', async function () {
    app = await setupRehostServer(rehoster, { logger: false, host: '127.0.0.1' })
    url = `http://127.0.0.1:${app.server.address().port}/`

    let res = await axios.get(url)
    expect(res.status).to.equal(200)
    expect(res.data).to.deep.equal([])

    res = await axios.put(`${url}${key}`, {})
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

  it('Can access metrics', async function () {
    app = await setupRehostServer(rehoster, { logger: false, host: '127.0.0.1' })
    url = `http://127.0.0.1:${app.server.address().port}/`

    const res = await axios.get(`${url}metrics`)
    expect(res.status).to.equal(200)
  })

  it('Can access health', async function () {
    app = await setupRehostServer(rehoster, { logger: false, host: '127.0.0.1' })
    url = `http://127.0.0.1:${app.server.address().port}/`

    const res = await axios.get(`${url}health`)
    expect(res.status).to.equal(200)
  })

  it('can update from a config file', async function () {
    const workDir = path.join(os.tmpdir(), Math.random().toString().slice(2))
    await fsProm.mkdir(workDir)
    const key1 = 'a'.repeat(64)
    const key2 = 'b'.repeat(64)
    try {
      const configPath = path.join(workDir, 'config.json')
      await fsProm.writeFile(
        configPath,
        JSON.stringify({
          [key1]: {},
          [key2]: { info: 'the b key' }
        })
      )
      app = await setupRehostServer(rehoster, {
        logger: false,
        host: '127.0.0.1',
        configPath
      })
      url = `http://127.0.0.1:${app.server.address().port}/`

      {
        // Applies init config
        const res = await axios.get(url)
        expect(res.status).to.equal(200)
        expect(res.data).to.deep.equal([
          { key: key1 },
          { key: key2, info: 'the b key' }
        ])
      }

      await fsProm.writeFile(
        configPath,
        JSON.stringify({ [key1]: {} })
      )
      {
        const res = await axios.post(`${url}sync`, {})
        expect(res.status).to.equal(200)
      }
      {
        // Synced with the new config
        const res = await axios.get(url)
        expect(res.status).to.equal(200)
        expect(res.data).to.deep.equal([
          { key: key1 }
        ])
      }
    } finally {
      await fsProm.rm(workDir, { recursive: true })
    }
  })

  it('sync returns 400 if no configFile specified', async function () {
    app = await setupRehostServer(rehoster, { logger: false, host: '127.0.0.1' })
    url = `http://127.0.0.1:${app.server.address().port}/`

    const res = await axios.post(`${url}sync`, {}, { validateStatus: false })
    expect(res.status).to.equal(400)
    expect(res.data).to.equal('No config path was specified during server startup')
  })

  it('Returns 400 if the configFile does not exist', async function () {
    const workDir = path.join(os.tmpdir(), Math.random().toString().slice(2))
    await fsProm.mkdir(workDir)
    try {
      const configPath = path.join(workDir, 'config.json')
      await fsProm.writeFile(
        configPath,
        '{}'
      )
      app = await setupRehostServer(rehoster, { logger: false, host: '127.0.0.1', configPath })
      url = `http://127.0.0.1:${app.server.address().port}/`

      await fsProm.rm(configPath)

      const res = await axios.post(`${url}sync`, {}, { validateStatus: false })
      expect(res.status).to.equal(400)
      expect(res.data).to.include('Could not apply the config at')
    } finally {
      await fsProm.rm(workDir, { recursive: true })
    }
  })
})
