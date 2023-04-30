import type { Knex } from 'knex'
import knex from 'knex'

const client: Record<string, Knex | undefined> = {
  PGClient: undefined,
}
export const createPGClient = <TRecord extends Record<string, unknown> = any, TResult = unknown[]>(): Knex<
  TRecord,
  TResult
> => {
  if (!client.PGClient) {
    client.PGClient = knex({
      client: 'pg',
      connection: process.env.DB_CONNECTION_STRING,
      pool: { min: 2, max: 15 },
      acquireConnectionTimeout: 1.5 * 60 * 1000,
    })
  }
  return client.PGClient as Knex<TRecord, TResult>
}

export const destroyClients = async () => {
  await client.PGClient?.destroy()
  client.PGClient = undefined
}
