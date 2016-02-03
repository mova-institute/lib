import * as express from 'express';
import {ClientConfig} from 'pg';
import {query1, query1Client, queryNumRows, query, transaction, BUSINESS_ERROR} from '../pg_utils';
import {tokenInfo} from '../fb_utils';
import {genAccessToken} from '../crypto';
import {config, Req, sendError} from './server';
import {MAX_CONCUR_ANNOT, mergeXmlFragments} from './business';
import {highlightConflicts} from './business.node';
import {markWordwiseDiff} from '../nlp/utils';

import {inspect} from 'util';




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
    sendError(res, 403);
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
export async function checkDocName(req: Req, res: express.Response) {
  let free = !(await query1(config, "SELECT id FROM document WHERE name=$1", [req.query.name]));
  res.json({ free });
}

////////////////////////////////////////////////////////////////////////////////
export async function addText(req: Req, res: express.Response) {
  await transaction(config, async (client) => {
    let docId = await query1Client(client, "INSERT INTO document (name) VALUES ($1) RETURNING id", [req.body.docName]);

    for (let [i, fragment] of req.body.fragments.entries()) {
      await query(client, "INSERT INTO fragment_version (doc_id, index, content) VALUES ($1, $2, $3)",
        [docId, i, fragment.xmlstr]);
    }

    let numFragments = req.body.fragments.length;
    let segments = [[0, 0]];
    for (let i = 0; i < numFragments - 1; ++i) {
      segments.push([i, i + 1]);
    }
    segments.push([numFragments - 1, numFragments - 1]);

    for (let segment of segments) {
      await query1Client(client, "INSERT INTO task (doc_id, type, fragment_start, fragment_end, name) VALUES ($1, 'annotate', $2, $3, $4)",
        [docId, segment[0], segment[1], req.body.fragments[segment[0]].firstWords.join(' ')]);
    }
  });
  res.json({ result: 'ok' });
}

////////////////////////////////////////////////////////////////////////////////
export async function assignTask(req: Req, res: express.Response) {  // todo: test
  let id = await transaction(config, async (client) => {
    let numAnnotating = (await query1Client(client, "SELECT get_task_count($1)", [req.bag.user.id])).annotate;
    if (numAnnotating >= MAX_CONCUR_ANNOT) {
      sendError(res, 400, `Max allowed concurrent annotations (${MAX_CONCUR_ANNOT}) exceeded`);
      return BUSINESS_ERROR;
    }
    return await query1Client(client, "SELECT assign_task_for_annotation($1)", [req.bag.user.id]);
  });

  res.json(id);
}

////////////////////////////////////////////////////////////////////////////////
export async function getTaskList(req: Req, res: express.Response) {
  let ret = await query1(config, "SELECT get_task_list($1, $2)", [req.bag.user.id, req.query.type]);
  res.json(wrapData(ret));
}

////////////////////////////////////////////////////////////////////////////////
export async function getTaskCount(req: Req, res: express.Response) {
  let ret = await query1(config, "SELECT get_task_count($1)", [req.bag.user.id]);
  res.json(wrapData(ret));
}

////////////////////////////////////////////////////////////////////////////////
export async function getTask(req: Req, res: express.Response) {
  let ret = await query1(config, "SELECT get_task($1, $2)", [req.bag.user.id, req.query.id]);
  ret.content = mergeXmlFragments(ret.fragments.map(x => x.content));
  delete ret.fragments;
  res.json(ret);
}

////////////////////////////////////////////////////////////////////////////////
export async function saveTask(req: Req, res: express.Response) {
  const now = new Date();
  let result = await transaction(config, async (client) => {
    const taskInDb = await query1Client(client, "SELECT get_task($1, $2)", [req.bag.user.id, req.body.id]);
    
    if (!taskInDb || taskInDb.status === 'done' || req.body.fragments.length !== taskInDb.fragments.length) {
      // console.error('BUSINESS_ERROR');
      // console.error(taskInDb);
      // console.error(req.body.fragments.length !== taskInDb.fragments.length);
      return BUSINESS_ERROR;
    }

    for (let [i, fragment] of req.body.fragments.entries()) {  // todo: status
      await query1Client(client, "INSERT INTO fragment_version(task_id, doc_id, index, status, added_at, content) VALUES($1, $2, $3, $4, $5, $6)",
        [req.body.id, taskInDb.docId, taskInDb.fragmentStart + i, 'in progress', now, fragment]);
    }
    if (/*true || */req.body.complete) {
      let tocheck = await query1Client(client, "SELECT complete_task($1)", [req.body.id]);
      // console.error(inspect(tocheck, {depth:null}) || 'nothing to check');
      // return BUSINESS_ERROR;
      for (let task of tocheck) {
        let highlightedFragments = [];
        let diffsTotal = 0;
        for (let fagment of task.fragments) {
          let [mine, theirs] = fagment.annotations;
          let {highlighted, numDiffs} = highlightConflicts(taskInDb.type, mine.content, theirs.content);
          highlightedFragments.push(highlighted);
          diffsTotal += numDiffs;
        }
        if (diffsTotal) {
          
          console.error('there are diffs!');
        }
      }
    }
    
    // return BUSINESS_ERROR;
  });

  if (result === BUSINESS_ERROR) {
    sendError(res, 400);
  }
  else {
    res.json('ok');
  }
}





//------------------------------------------------------------------------------
function wrapData(data) {
  return { data };
}

/*

TODO:

- added_at
- wrap all

*/