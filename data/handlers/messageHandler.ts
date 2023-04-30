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
import { REST, Routes } from 'discord.js'
import dotenv from 'dotenv'
import type { Knex } from 'knex'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const myUserId = process.env.DISCORD_USERID
const token = process.env.DISCORD_TOKEN

const rest = new REST({ version: '10' }).setToken(token!)

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

export interface DiscordUser {
  id: string
  username: string
  avatar: string
  discriminator: string
  public_flags: number
  flags: number
  banner?: string
  accent_color?: string
  global_name?: string
  avatar_decoration?: string
  display_name?: string
  banner_color?: string
}

export type IUser = Pick<DiscordUser, 'id' | 'username' | 'discriminator'>

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
  PRIVATE_THREAD,
}

export const messageHandler = async () => {
  const client = createPGClient()
  const { channelMessageMap, channels } = await parseChannels()

  const bar = new ProgressBar('Processing channels [:bar] :current/:total :percent :etas', {
    total: channels.length,
  })

  for (let i = 0; i < channels.length; i++) {
    switch (channels[i].type) {
      case MessageType.DM:
      case MessageType.GROUP_DM: {
        const filteredRecipients = channels[i].recipients?.filter((recipient) => recipient !== myUserId)
        if (filteredRecipients) {
          await insertUsers(filteredRecipients, client)
        }
        await insertChannel(channels[i])
        bar.tick()
        break
      }
      default: {
        await insertChannel(channels[i])
        bar.tick()
      }
    }
  }

  // Resolve channeltypes
  // If its a DM type resolve recipients involved
  // Filter own userId and lookup/insert other users
  // Insert channel in DB
  // Insert recipients linked to channel
  // Insert message linked to channel
}

export const getDMMessages = (channels: IChannel[]): IChannel[] =>
  channels.filter((channel) => channel.type === MessageType.DM)
export const getGroupMessages = (channels: IChannel[]): IChannel[] =>
  channels.filter((channel) => channel.type === MessageType.GROUP_DM)

const parseChannels = async (): Promise<{ channels: IChannel[]; channelMessageMap: Map<string, IMessage[]> }> => {
  return new Promise((resolve, _reject) => {
    const messageDirectories = readdirSync(path.resolve(__dirname, './../input/messages')).filter(
      (file) => !['.DS_Store', 'index.json'].includes(file),
    )
    const bar = new ProgressBar('Parsing raw channel data [:bar] :current/:total :percent :etas', {
      total: messageDirectories.length,
    })
    const channels: IChannel[] = []
    const channelMessageMap: Map<string, IMessage[]> = new Map()

    for (let i = 0; i < messageDirectories.length; i++) {
      const channelFile = readFileSync(
        path.resolve(__dirname, `./../input/messages/${messageDirectories[i]}/channel.json`),
        'utf8',
      )
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

const fetchUser = async (id: string): Promise<DiscordUser | undefined> =>
  (await rest.get(Routes.user(id))) as DiscordUser | undefined

const insertChannel = async (channel: IChannel) => {
  const client = createPGClient()

  const channelExists = await client('channels').where('id', channel.id)
  if (channelExists.length === 0) {
    console.log('Channel not in db')
    const insert = client('channels').insert({ id: channel.id, type: channel.type, server_id: channel.guild?.id })
    console.log(insert.toQuery())
    await insert
  }
}

const insertUsers = async (recipients: string[], client: Knex) => {
  await Promise.all(
    recipients.map(async (recipientId) => {
      console.log('Checking if user exists', recipientId)
      const userExists = await client('users').where('id', recipientId)

      if (userExists.length === 0) {
        console.log('User not in db. Performing API lookup...')
        const user = await fetchUser(recipientId)
        if (!user) throw new Error('User does not exist')
        const insert = client('users').insert({
          id: user.id,
          username: user.username,
          discriminator: user.discriminator,
        })
        await insert
      }
    }),
  )
}
