import { readdirSync } from 'fs'
import path from 'node:path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'node:fs'
import { createPGClient } from '~/data/database'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface IServer {
  id: string
  name: string
}

export const serverHandler = async () => {
  const serverDirectories = readdirSync(path.resolve(__dirname, './../input/servers')).filter(
    (file) => !['.DS_Store', 'index.json'].includes(file),
  )

  for (let i = 0; i < serverDirectories.length; i++) {
    const guildFile = readFileSync(
      path.resolve(__dirname, `./../input/servers/${serverDirectories[i]}/guild.json`),
      'utf8',
    )
    const server: IServer = JSON.parse(guildFile)
    await insertServer(server)
  }
  console.log('Server count', serverDirectories.length)
}

const insertServer = async (server: IServer) => {
  const client = createPGClient()

  const serverExists = await client('servers').where('id', server.id)

  if (!serverExists) await client('servers').insert({ id: server.id, name: server.name })
}
