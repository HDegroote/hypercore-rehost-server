import * as dotenv from 'dotenv'
dotenv.config()

export default function loadConfig () {
  const config = {
    HOST: process.env.HOST || '127.0.0.1',
    PORT: parseInt(process.env.PORT || 0),
    SWARM_PORT: parseInt(process.env.SWARM_PORT || 0),
    EXPOSE_SWARM: (process.env.EXPOSE_SWARM || '').toLowerCase().trim() === 'true',
    CORESTORE_LOC: process.env.CORESTORE_LOC || './rehoster-corestore',
    BEE_NAME: process.env.BEE_NAME || 'rehoster-bee',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    MIN_LOG_SUMMARY_INTERVAL: parseInt(process.env.MIN_LOG_SUMMARY_INTERVAL || 60),
    REHOSTER_KEYS_PATH: process.env.REHOSTER_KEYS_PATH,
    DETAILED_METRICS: (process.env.DETAILED_METRICS || '').toLowerCase().trim() === 'true'
  }

  return config
}
