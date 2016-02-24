import {connect, Client, ClientConfig, QueryResult} from 'pg';
const camelCase = require('camelcase');
const decamelize = require('decamelize');


////////////////////////////////////////////////////////////////////////////////
export const PG_ERR = {  // http://www.postgresql.org/docs/current/static/errcodes-appendix.html
  serialization_failure: '40001',
}

//------------------------------------------------------------------------------
const MAX_TRANSACTION_RETRY = 100;


////////////////////////////////////////////////////////////////////////////////
export class PgClient {
  
  static async get(config: ClientConfig) {
    let { client, done } = await getClient(config);
    return new PgClient(client, done);
  }

  constructor(private _client: Client, private _done = null) { }
  
  release() {
    this._client = null;
    this._done && this._done();
  }
  
  query(queryStr: string, ...params) {
    return query(this._client, queryStr, params);
  }

  call(func: string, ...params) {
    let queryStr = `SELECT ${func}(${nDollars(params.length)})`;
    return query1Client(this._client, queryStr, params);
  }
  
  select(table: string, where: string, ...params) {
    let queryStr = `SELECT row_to_json(${table}) FROM ${table} WHERE ${where}`;
    return query1Client(this._client, queryStr, params);    
  }
  
  select1(table: string, column: string, where: string, ...params) {
    let queryStr = `SELECT ${column} FROM ${table} WHERE ${where}`;
    return query1Client(this._client, queryStr, params);    
  }
  
  update(table: string, set: string, where: string, ...params) {
    let queryStr = `UPDATE ${table} SET ${set} WHERE ${where} RETURNING to_json(${table})`;
    return query1Client(this._client, queryStr, params);    
  }
  
  insert(table: string, dict: Object, returning?: string) {
    return this._insert(table, dict, null, returning);
  }
  
  insertIfNotExists(table: string, dict: Object, returning?: string) {
    return this._insert(table, dict, 'NOTHING', returning);
  }
  
  delete(table: string, where: string, returning: string, ...params) {
    let queryStr = `DELETE FROM ${table} WHERE ${where}`;
    if (returning) {
      queryStr += ' RETURNING ' + returning;
    }
    
    return query1Client(this._client, queryStr, params);        
  }
  
  private _insert(table: string, dict: Object, onConflict: string, returning: string) {
    dict = snakize(dict);
    
    let keys = Object.keys(dict);
    let queryStr = `INSERT INTO ${table}(${keys.join(',')}) VALUES (${nDollars(keys.length)})`;
    if (onConflict) {
      queryStr += ' ON CONFLICT DO ' + onConflict;
    }
    if (returning) {
      queryStr += ' RETURNING ' + returning;
    }
    
    return query1Client(this._client, queryStr, keys.map(x => dict[x]));    
  }
}

////////////////////////////////////////////////////////////////////////////////
export function getClient(config: ClientConfig) {
  return new Promise<{ client: Client, done }>((resolve, reject) => {
    connect(config, (err, client, done) => {
      if (err) {
        console.error(err);
        reject(err);
      }
      else {
        resolve({ client, done });
      }
    });
  });
}

////////////////////////////////////////////////////////////////////////////////
export function query(client: Client, queryStr: string, params: Array<any> = []) {
  return new Promise<QueryResult>(async (resolve, reject) => {
    client.query(queryStr, params, (err, result) => {
      if (err) {
        // console.error(err);
        reject(err);
      }
      else {
        resolve(result);
      }
    });
  });
}

////////////////////////////////////////////////////////////////////////////////
export async function query1Client(client: Client, queryStr: string, params: Array<any> = []) {
  let result = await query(client, queryStr, params);
  if (result && result.rows.length) {
    let row = result.rows[0];
    var ret = row[Object.keys(row)[0]] || null;
    if (ret && typeof ret === 'object') {
      ret = camelized(ret);
    }
  }

  return ret;
}

////////////////////////////////////////////////////////////////////////////////
export async function query1(config: ClientConfig, queryStr: string, params: Array<any> = []) {
  let { client, done } = await getClient(config);
  let result = await query1Client(client, queryStr, params);
  done();

  return result;
}

////////////////////////////////////////////////////////////////////////////////
export async function queryNumRows(config: ClientConfig, queryStr: string, params: Array<any> = []) {
  let { client, done } = await getClient(config);
  let result = await query(client, queryStr, params);
  let ret = result && (<any>result).rowCount || null;
  done();

  return ret;
}

////////////////////////////////////////////////////////////////////////////////
export async function transaction(config: ClientConfig, f: (client: PgClient) => Promise<any>) {
  let client = await PgClient.get(config);
  
  for (let i = 1; ; ++i) {
    try {
      await client.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE");  // todo: remove await?
      var ret = await f(client);
      await client.query("COMMIT");
    }
    catch (e) {
      await client.query("ROLLBACK");

      if (i === MAX_TRANSACTION_RETRY) {
        throw new Error('Max transaction retries exceeded');
      }

      if (e instanceof Error && e.code === PG_ERR.serialization_failure) {
        continue;
      }

      throw e;
    }
    finally {
      client.release();
    }

    break;
  }

  return ret;
}


//------------------------------------------------------------------------------
function camelized(obj) {  // dirty
  let json = JSON.stringify(obj).replace(/"(\w+)":/g, (a, b) => `"${camelCase(b)}":`);
  return JSON.parse(json);
}

//------------------------------------------------------------------------------
function snakize(obj) {  // first-level only
  for (let key of Object.keys(obj)) {
    let snake = decamelize(key);
    if (snake !== key) {
      obj[snake] = obj[key];
      delete obj[key];
    }
  }
  
  return obj;
}

//------------------------------------------------------------------------------
function nDollars(n: number) {
  let ret = '';
  if (n) {
    for (var i = 1; i < n; ++i) {
      ret += '$' + i + ', ';
    }
    ret += '$' + n;
  }

  return ret;
}