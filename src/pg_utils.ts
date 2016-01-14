import {connect, Client, ClientConfig, QueryResult} from 'pg';



////////////////////////////////////////////////////////////////////////////////
export function getConnection(config: ClientConfig) {
  return new Promise<{ connection: Client, done }>((resolve, reject) => {
    connect(config, (err, connection, done) => {
      if (err) {
        console.error(err);
        reject(err);
      }
      else {
        resolve({ connection, done });
      }
    });
  });
}

////////////////////////////////////////////////////////////////////////////////
export function query(connection: Client, query: string, params: Array<any> = []) {
  return new Promise<QueryResult>(async (resolve, reject) => {
    connection.query(query, params, (err, result) => {
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
export async function queryScalarCon(connection: Client, queryStr: string, params: Array<any> = []) {
  let result = await query(connection, queryStr, params);
  if (result && result.rows.length) {
    let row = result.rows[0];
    return row[Object.keys(row)[0]] || null;
  }
  
  return null;
}

////////////////////////////////////////////////////////////////////////////////
export async function queryScalar(config: ClientConfig, queryStr: string, params: Array<any> = []) {
  let { connection, done } = await getConnection(config);
  let result = await queryScalarCon(connection, queryStr, params);
  done();
  
  return result;
}

////////////////////////////////////////////////////////////////////////////////
export async function queryNumRows(config: ClientConfig, queryStr: string, params: Array<any> = []) {
  let { connection, done } = await getConnection(config);
  let result = await query(connection, queryStr, params);
  let out = result && (<any>result).rowCount || null;
  done();
  
  return out;
}