import { REST, Routes } from 'discord.js'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'url'
import { getDMMessages, messageHandler, MessageType } from '~/data/handlers/messageHandler'
import { createPGClient, destroyClients } from '~/data/database'
import { serverHandler } from '~/data/handlers/serverHandler'

dotenv.config()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const myUserId = process.env.DISCORD_USERID
const token = process.env.DISCORD_TOKEN

const rest = new REST({ version: '10' }).setToken(token!)
const fetchUser = async (id: string) => rest.get(Routes.user(id))

const client = createPGClient()

const main = async () => {
  await serverHandler()
  await messageHandler()
}

main().finally(() => destroyClients())
// console.log(await client.from('servers'))
