import {connect, Client, ClientConfig, QueryResult} from 'pg';



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
    return row[Object.keys(row)[0]] || null;
  }

  return null;
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
export class ErrorInsideTransaction {

}
////////////////////////////////////////////////////////////////////////////////
export async function transaction(config: ClientConfig, f: (client: Client) => Promise<any>) {
  let { client, done } = await getClient(config);

  while (true) {
    try {
      await query(client, "BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE");  // todo: remove await?
      
      var res = await f(client);
      if (res instanceof ErrorInsideTransaction) {
        await query(client, "ROLLBACK");
        return res;
      }

      await query(client, "COMMIT");
    }
    catch (e) {
      await query(client, "ROLLBACK");
      if (e instanceof Error && e.code === '40001') {
        continue;
      }
      else {
        throw e;
      }
    }
    finally {
      done();
    }

    break;
  }

  return res;
}