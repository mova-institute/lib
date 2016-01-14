import * as express from 'express';
import {ClientConfig} from 'pg';
import {queryScalar, queryScalarCon, queryNumRows, getConnection, query} from '../pg_utils';
import {tokenInfo} from '../fb_utils';
import {genAccessToken} from '../crypto';
import {config} from './server'




////////////////////////////////////////////////////////////////////////////////
export async function getRole(req, res: express.Response) {
  res.json(req.bag.annotatorRole || 'none' );
}

////////////////////////////////////////////////////////////////////////////////
export async function logoff(req: express.Request, res: express.Response) {
  res.clearCookie('accessToken').json('ok');
}
////////////////////////////////////////////////////////////////////////////////
export async function login(req: express.Request, res: express.Response) {
  let fbInfo = await tokenInfo(req.query.fbToken);
  if (fbInfo.error) {
    res.status(403).json('403');
  }
  else {
    let token = await genAccessToken();
    if (await queryNumRows(config, 'UPDATE login SET access_token=$1 WHERE fb_id=$2', [token, fbInfo.id])) {
      res.cookie('accessToken', token, { maxAge: 1000 * 3600 * 24 * 100, httpOnly: true });
      
      let role = await queryScalar(config, 'SELECT annotator_user.role FROM annotator_user' +
        ' JOIN login ON annotator_user.person_id=login.person_id WHERE access_token=$1', [token]);
      res.json(role);
    }
    else {
      res.status(403).json('403');
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export async function checkTextName(req: express.Request, res: express.Response) {
  let free = !(await queryNumRows(config, 'SELECT id FROM corpus_doc WHERE name=$1', [req.query.name]));
  res.json({ free });
}


/*////////////////////////////////////////////////////////////////////////////////
export async function grabTask(req: express.Request, res: express.Response) {
  let role = await queryAnnotatorRole(req.query.fb_token);
  if (role) {
    console.error(role);
  }
  else {
    res.status(400).end();
  }
}*/

////////////////////////////////////////////////////////////////////////////////
export async function getFragments(req: express.Request, res: express.Response) {
  let input = JSON.parse(req.body);  // todo
  if (input.assignee) {
    let out = await queryScalar(config, "", [input.assignee]);
  }
  else {

  }
}

////////////////////////////////////////////////////////////////////////////////
export async function newText(req: express.Request, res: express.Response) {
  let data = JSON.parse(req.body);  // todo
  let { connection, done } = await getConnection(config);

  await query(connection, "BEGIN");
  let id = await queryScalarCon(connection, "INSERT INTO corpus_doc (name) VALUES ($1) RETURNING corpus_doc.id", [data.docName]);

  let i = 0;
  for (let fragment of data.fragments) {
    await query(connection, "INSERT INTO corpus_fragment (doc_id, index, is_pooled, content) VALUES ($1, $2, $3, $4)",
      [id, i++, data.isForPool, fragment]);

  }
  await query(connection, "COMMIT");

  done();
  res.json({ result: 'ok' });
}

/*////////////////////////////////////////////////////////////////////////////////
async function queryAnnotatorRole(fbToken: string) {
  let result = await queryScalar(config, "SELECT to_json(t) FROM (SELECT login.fb_id, annotator_user.role FROM annotator_user JOIN login ON "
    + "annotator_user.person_id=login.person_id WHERE fb_token_updated_at > now() - INTERVAL '2 hours'"
    + " AND fb_token=$1) t", [fbToken]);

  if (result) {
    return result.role;
  }
  else {
    let fbInfo = await tokenInfo(fbToken);
    if (fbInfo.error) {
      return null;
    }
    else {
      if (await queryNumRows(config, 'UPDATE login SET fb_token=$1, fb_token_updated_at=now() WHERE fb_id=$2', [fbToken, fbInfo.id])) {
        return await queryScalar(config, 'SELECT annotator_user.role FROM annotator_user' +
          ' JOIN login ON annotator_user.person_id=login.person_id WHERE fb_id=$1', [fbInfo.id]);
      }

      return null;
    }
  }
}

// async function _getRole(token: string) {
//   let result = await queryScalar(config, "SELECT role FROM annotator_user JOIN login ON annotator_user.person_id=login.person_id WHERE access_token=$1", [token]);
// }*/