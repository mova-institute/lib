import * as express from 'express';
import {ClientConfig} from 'pg';
import {query1, query1Client, queryNumRows, query, transaction, ErrorInsideTransaction} from '../pg_utils';
import {tokenInfo} from '../fb_utils';
import {genAccessToken} from '../crypto';
import {config, Req, sendError} from './server';
import {MAX_CONCUR_ANNOT, mergeXmlFragments} from './common';




////////////////////////////////////////////////////////////////////////////////
export async function getRole(req, res: express.Response) {
  res.json(req.bag.user && req.bag.user.annotatorRole || 'none');
}

////////////////////////////////////////////////////////////////////////////////
export async function logoff(req: Req, res: express.Response) {
  res.clearCookie('accessToken').json('ok');
}

////////////////////////////////////////////////////////////////////////////////
export async function login(req: Req, res: express.Response) {
  let fbInfo = await tokenInfo(req.query.fbToken);

  if (fbInfo.error) {
    sendError(res, 403); console.error('tyloh');
  }
  else {
    let token = await genAccessToken();
    if (await queryNumRows(config, "UPDATE login SET access_token=$1 WHERE fb_id=$2", [token, fbInfo.id])) {
      res.cookie('accessToken', token, { maxAge: 1000 * 3600 * 24 * 100, httpOnly: true });

      let role = await query1(config, "SELECT role FROM appuser JOIN login ON appuser.person_id=login.person_id WHERE access_token=$1", [token]);
      res.json(role);
    }
    else {
      sendError(res, 403);
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export async function assignTask(req: Req, res: express.Response) {  // todo: test
  let id = await transaction(config, async (client) => {
    let numAnnotating = await query1Client(client, "select count(*) from task where user_id=$1 and type='annotate'", [req.bag.user.id]);
    if (numAnnotating >= MAX_CONCUR_ANNOT) {
      sendError(res, 400, `Max allowed concurrent annotations (${MAX_CONCUR_ANNOT}) exceeded`);
      return new ErrorInsideTransaction();
    }
    return await query1Client(client, "SELECT assign_task_for_annotation($1)", [req.bag.user.id]);
  });

  res.json(id);
}

////////////////////////////////////////////////////////////////////////////////
export async function checkDocName(req: Req, res: express.Response) {
  let free = !(await query1(config, "SELECT id FROM document WHERE name=$1", [req.query.name]));
  res.json({ free });
}

////////////////////////////////////////////////////////////////////////////////
export async function getTask(req: Req, res: express.Response) {
  let ret = await query1(config, "SELECT get_task($1, $2)", [req.bag.user.id, req.query.id]);
  ret.content = mergeXmlFragments(ret.fragments.map(x => x.content));
  delete ret.fragments;
  res.json(ret);
}

////////////////////////////////////////////////////////////////////////////////
export async function getTaskList(req: Req, res: express.Response) {
  let ret = await query1(config, "SELECT get_task_list($1, $2)", [req.bag.user.id, req.query.status]);
  res.json(wrapData(ret));
}

////////////////////////////////////////////////////////////////////////////////
export async function getTaskCount(req: Req, res: express.Response) {
  let ret = await query1(config, "SELECT get_task_count($1)", [req.bag.user.id]);
  res.json(wrapData(ret));
}

/*


////////////////////////////////////////////////////////////////////////////////
export async function getTasks(req: Req, res: express.Response) {
  res.json(await query1(config, "SELECT annotator_fragments($1)", [req.query.userId]));
}

////////////////////////////////////////////////////////////////////////////////
export async function getFragments(req: Req, res: express.Response) {
  let input = JSON.parse(req.body);  // todo
  if (input.assignee) {
    let ret = await query1(config, "", [input.assignee]);
  }
  else {

  }
}*/

////////////////////////////////////////////////////////////////////////////////
export async function addText(req: Req, res: express.Response) {
  await transaction(config, async (client) => {
    let docId = await query1Client(client, "INSERT INTO document (name) VALUES ($1) RETURNING id", [req.body.docName]);
    
    let numFragments = req.body.fragments.length;
    for (let i = 0; i < numFragments; ++i) {
      await query(client, "INSERT INTO fragment_version (doc_id, index, content) VALUES ($1, $2, $3)",
        [docId, i, req.body.fragments[i]]);
    }

    let segments = [[0, 0]];
    for (let i = 0; i < numFragments - 1; ++i) {
      segments.push([i, i + 1]);
    }
    segments.push([numFragments - 1, numFragments - 1]);

    for (let segment of segments) {
      await query1Client(client, "INSERT INTO task (doc_id, type, fragment_start, fragment_end) VALUES ($1, 'annotate', $2, $3)",
        [docId, segment[0], segment[1]]);
    }
  });
  res.json({ result: 'ok' });
}



function wrapData(data) {
  return { data };
}



/*

TODO:

- added_at

*/