import * as dotenv from 'dotenv'
dotenv.config()

export default function loadConfig () {
  const config = {
    HOST: process.env.host || '127.0.0.1',
    PORT: process.env.PORT || 0,
    SWARM_PORT: process.env.SWARM_PORT || 0,
    CORESTORE_LOC: process.env.CORESTORE_LOC || './rehoster-corestore',
    BEE_NAME: process.env.BEE_NAME || 'rehoster-bee',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    MIN_LOG_SUMMARY_INTERVAL: process.env.MIN_LOG_SUMMARY_INTERVAL || 60
  }

  console.log('Using config:')
  console.log(config)

  return config
}
