import { connect, Client, ClientConfig, QueryResult } from 'pg'
const types = require('pg').types
import camelCase = require('camelcase')
import decamelize = require('decamelize')

export const PG_ERR = {
  // http://www.postgresql.org/docs/current/static/errcodes-appendix.html
  serialization_failure: '40001',
}

// see https://github.com/brianc/node-pg-types
// select typname, oid, typarray from pg_type where typtype = 'b'
export const PG_TYPES = {
  json: 114,
  jsonb: 3802,
}

types.setTypeParser(PG_TYPES.json, camelizeParseJson)
types.setTypeParser(PG_TYPES.jsonb, camelizeParseJson)

export class PgClient {
  private client: Client
  private done: Function

  static async transaction(
    config: ClientConfig,
    f: (client: PgClient) => Promise<any>,
  ) {
    let client = await PgClient.create(config)

    let ret
    for (let i = 1; ; ++i) {
      try {
        await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE') // todo: remove await?
        ret = await f(client)
        await client.query('COMMIT')
      } catch (e) {
        await client.query('ROLLBACK')

        const MAX_TRANSACTION_RETRY = 100
        if (i === MAX_TRANSACTION_RETRY) {
          throw new Error('Max transaction retries exceeded')
        }

        if (e.code === PG_ERR.serialization_failure) {
          continue
        }

        throw e
      } finally {
        client.release()
      }

      break
    }

    return ret
  }

  private static async create(config: ClientConfig) {
    let { client, done } = await getClient(config)
    let ret = new PgClient()
    ret.client = client
    ret.done = done

    return ret
  }

  constructor() {}

  release() {
    this.client = null
    if (this.done) {
      this.done()
    }
  }

  query(queryStr: string, ...params) {
    return query(this.client, queryStr, params)
  }

  call(func: string, ...params) {
    let queryStr = `SELECT ${func}(${nDollars(params.length)})`
    return query1Client(this.client, queryStr, params)
  }

  select(table: string, where: string, ...params) {
    let queryStr = `SELECT row_to_json(${table}) FROM ${table} WHERE ${where}`
    return query1Client(this.client, queryStr, params)
  }

  select1(table: string, column: string, where: string, ...params) {
    let queryStr = `SELECT ${column} FROM ${table} WHERE ${where}`
    return query1Client(this.client, queryStr, params)
  }

  update(table: string, set: string, where: string, ...params) {
    let queryStr = `UPDATE ${table} SET ${set} WHERE ${where} RETURNING to_json(${table})`
    return query1Client(this.client, queryStr, params)
  }

  insert(table: string, dict: Object, returning?: string) {
    return this.doInsert(table, dict, null, returning)
  }

  insertIfNotExists(table: string, dict: Object, returning?: string) {
    return this.doInsert(table, dict, 'NOTHING', returning)
  }

  delete(table: string, where: string, returning: string, ...params) {
    let queryStr = `DELETE FROM ${table} WHERE ${where}`
    if (returning) {
      queryStr += ' RETURNING ' + returning
    }

    return query1Client(this.client, queryStr, params)
  }

  private doInsert(
    table: string,
    dict: Object,
    onConflict: string,
    returning: string,
  ) {
    dict = snakize(dict)

    let keys = Object.keys(dict)
    let queryStr = `INSERT INTO ${table}(${keys.join(',')}) VALUES (${nDollars(
      keys.length,
    )})`
    if (onConflict) {
      queryStr += ' ON CONFLICT DO ' + onConflict
    }
    if (returning) {
      queryStr += ' RETURNING ' + returning
    }

    return query1Client(
      this.client,
      queryStr,
      keys.map((x) => dict[x]),
    )
  }
}

export function getClient(config: ClientConfig) {
  return new Promise<{ client: Client; done }>((resolve, reject) => {
    connect(config, (err, client, done) => {
      if (err) {
        reject(err)
      } else {
        resolve({ client, done })
      }
    })
  })
}

export function query(
  client: Client,
  queryStr: string,
  params: Array<any> = [],
) {
  return new Promise<QueryResult>(async (resolve, reject) => {
    client.query(queryStr, params, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}

export async function query1Client(
  client: Client,
  queryStr: string,
  params: Array<any> = [],
) {
  let ret = null
  let res = await query(client, queryStr, params)
  if (res && res.rows.length) {
    let row = res.rows[0]
    ret = row[Object.keys(row)[0]] || null
  }

  return ret
}

function camelizeParseJson(jsonStr: string) {
  let camelized = jsonStr.replace(
    /"(\w+)"\s*:/g,
    (a, b) => `"${camelCase(b)}":`,
  )
  return JSON.parse(camelized)
}

function snakize(obj) {
  // first-level only
  for (let key of Object.keys(obj)) {
    let snake = decamelize(key)
    if (snake !== key) {
      obj[snake] = obj[key]
      delete obj[key]
    }
  }

  return obj
}

function nDollars(n: number) {
  let ret = ''
  if (n) {
    for (let i = 1; i < n; ++i) {
      ret += '$' + i + ', '
    }
    ret += '$' + n
  }

  return ret
}
