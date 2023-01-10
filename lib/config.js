import * as dotenv from 'dotenv'
import rc from 'rc'
dotenv.config()

const APPLICATION_NAME = 'REHOST_SERVER'

export default function loadConfig () {
  const config = rc(APPLICATION_NAME, {
    HOST: undefined,
    PORT: undefined,
    HOURS_SYNC_INTERVAL: undefined, // No autosync if undefined
    CORESTORE_LOC: './rehoster-corestore',
    BEE_NAME: 'rehoster-bee',
    LOG_LEVEL: 'info'
  })

  console.log('Using config:')
  console.log(config)

  return config
}
