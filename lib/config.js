import * as dotenv from 'dotenv'
import rc from 'rc'
dotenv.config()

const APPLICATION_NAME = 'REHOST_SERVER'

export default function loadConfig () {
  const config = rc(APPLICATION_NAME, {
    HOST: undefined,
    PORT: undefined,
    SWARM_PORT: undefined,
    CORESTORE_LOC: './rehoster-corestore',
    BEE_NAME: 'rehoster-bee',
    LOG_LEVEL: 'info',
    MIN_LOG_SUMMARY_INTERVAL: 60
  })

  console.log('Using config:')
  console.log(config)

  return config
}
