import { messageHandler } from '~/data/handlers/messageHandler'
import { destroyClients } from '~/data/database'
import { serverHandler } from '~/data/handlers/serverHandler'

const main = async () => {
  await serverHandler()
  await messageHandler()
}

main().finally(() => destroyClients())
