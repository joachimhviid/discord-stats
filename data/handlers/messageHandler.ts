// for each folder in '/messages/*'
// parse channel.json to determine message type, location, recipients
// parse messages.csv to an array of objects
// insert into appropriate db table

import { createReadStream, readdirSync } from 'fs'
import path from 'node:path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'node:fs'
import csv from 'csv-parser'
import ProgressBar from 'progress'
import { createPGClient } from '~/data/database'


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface IChannel {
  id: string
  type: number
  name?: string
  recipients?: string[]
  guild?: {
    id: string
    name: string
  }
}

export interface IMessage {
  ID: string
  Timestamp: string
  Contents: string
  Attachments: string
}

export enum MessageType {
  GUILD_TEXT,
  DM,
  GUILD_VOICE,
  GROUP_DM,
  GUILD_CATEGORY,
  GUILD_ANNOUNCEMENT,
  ANNOUNCEMENT_THREAD = 10,
  PUBLIC_THREAD,
  PRIVATE_THREAD
}

export const messageHandler = async () => {
  const { channelMessageMap, channels } = await parseChannels()
}

export const getDMMessages = (channels: IChannel[]): IChannel[] => channels.filter((channel) => channel.type === MessageType.DM)
export const getGroupMessages = (channels: IChannel[]): IChannel[] => channels.filter((channel) => channel.type === MessageType.GROUP_DM)

const parseChannels = async (): Promise<{ channels: IChannel[], channelMessageMap: Map<string, IMessage[]> }> => {
  return new Promise((resolve, reject) => {
    const messageDirectories = readdirSync(path.resolve(__dirname, './../input/messages')).filter((file) => !['.DS_Store', 'index.json'].includes(file))
    const bar = new ProgressBar('Processing [:bar] :current/:total :percent :etas', { total: messageDirectories.length })
    const channels: IChannel[] = []
    const channelMessageMap: Map<string, IMessage[]> = new Map()

    for (let i = 0; i < messageDirectories.length; i++) {
      const channelFile = readFileSync(path.resolve(__dirname, `./../input/messages/${messageDirectories[i]}/channel.json`), 'utf8')
      const messagesFilePath = path.resolve(__dirname, `./../input/messages/${messageDirectories[i]}/messages.csv`)

      const channel = JSON.parse(channelFile)
      channels.push(channel)
      const channelMessages: IMessage[] = []

      createReadStream(messagesFilePath)
          .pipe(csv())
          .on('data', (data: IMessage) => {
            channelMessages.push(data)
          })
          .on('finish', () => {
            channelMessageMap.set(messageDirectories[i], channelMessages)
            bar.tick()
            if (channelMessageMap.size === messageDirectories.length) {
              resolve({ channels, channelMessageMap })
            }
          })
    }
  })
}
