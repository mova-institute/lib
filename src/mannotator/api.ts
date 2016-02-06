import * as express from 'express';
import {ClientConfig} from 'pg';
import {query1, queryNumRows, transaction, BUSINESS_ERROR} from '../postrges';
import {tokenInfo} from '../fb_utils';
import {genAccessToken} from '../crypto';
import {config, Req, sendError} from './server';
import {MAX_CONCUR_ANNOT, mergeXmlFragments, nextTaskType} from './business';
import {markConflicts} from './business.node';
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
    let token = await genAccessToken();  // todo: transaction?
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
    let docId = await client.insert('document', { name: req.body.docName }, 'id');

    for (let [i, fragment] of req.body.fragments.entries()) {
      await client.insert('fragment_version', {
        doc_id: docId,
        index: i,
        content: fragment.xmlstr
      });
    }

    let numFragments = req.body.fragments.length;
    let segments = [[0, 0]];
    for (let i = 0; i < numFragments - 1; ++i) {
      segments.push([i, i + 1]);
    }
    segments.push([numFragments - 1, numFragments - 1]);

    for (let segment of segments) {
      await client.insert('task', {
        doc_id: docId,
        type: 'annotate',
        fragment_start: segment[0],
        fragment_end: segment[1],
        name: req.body.fragments[segment[0]].firstWords.join(' '),
      });
    }
  });
  res.json({ result: 'ok' });
}

////////////////////////////////////////////////////////////////////////////////
export async function assignTask(req: Req, res: express.Response) {  // todo: test
  let id = await transaction(config, async (client) => {
    let numAnnotating = (await client.call('get_task_count', req.bag.user.id)).annotate;
    if (numAnnotating >= MAX_CONCUR_ANNOT) {
      sendError(res, 400, `Max allowed concurrent annotations (${MAX_CONCUR_ANNOT}) exceeded`);
      return BUSINESS_ERROR;
    }
    return await client.call('assign_task_for_annotation', req.bag.user.id);
  });

  res.json(wrapData(id));
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
  let ret: any = { msg: 'ok' };
  
  const now = new Date();
  
  let result = await transaction(config, async (client) => {
    const taskInDb = await client.call('get_task', req.bag.user.id, req.body.id);

    if (!taskInDb || taskInDb.status === 'done' || req.body.fragments.length !== taskInDb.fragments.length) {
      return BUSINESS_ERROR;
    }

    for (let [i, fragment] of req.body.fragments.entries()) {  // todo: status
      await client.insert('fragment_version', {
        task_id: req.body.id,
        doc_id: taskInDb.docId,
        index: taskInDb.fragmentStart + i,
        status: 'in progress',
        added_at: now,
        content: fragment
      });
    }

    if (req.body.complete) {
      let tocheck = await client.call('complete_task', req.body.id);

      for (let task of tocheck) {
        let markedFragments = [];
        let diffsTotal = 0;
        for (let fagment of task.fragments) {
          let [mine, theirs] = fagment.annotations;
          let {marked, numDiffs} = markConflicts(taskInDb.type, mine.content, theirs.content);
          markedFragments.push(marked);
          diffsTotal += numDiffs;
        }

        if (diffsTotal) {
          let taskToReview = await client.select('task', 'id=$1', task.taskId);
          let reviewTaskId = await client.insert('task', {
            doc_id: task.docId,
            user_id: task.userId,
            type: nextTaskType(taskToReview.type),
            fragment_start: taskToReview.fragmentStart,
            fragment_end: taskToReview.fragmentEnd,
            name: taskToReview.name
          }, 'id');

          for (let [i, fragment] of markedFragments.entries()) {
            await client.insert('fragment_version', {
              task_id: reviewTaskId,
              doc_id: task.docId,
              index: taskToReview.fragmentStart + i,
              status: 'pristine',
              added_at: now,
              content: fragment
            });
          }
        }
      }
    }
  });
  
  if (result === BUSINESS_ERROR) {
    sendError(res, 400);
    return;
  }
  
  if (req.body.grabNext) {
    result = await transaction(config, async (client) => {
      let reviewDoc = (await client.call('get_task_list', req.bag.user.id, 'review'))[0];
      if (reviewDoc) {
        var nextTaskId = reviewDoc.tasks[0].taskId;
      }
      else {
        nextTaskId = await client.call('assign_task_for_annotation', req.bag.user.id);
      }
      
      ret.data = nextTaskId || null;
    });
  }

  if (result === BUSINESS_ERROR) {
    sendError(res, 400);
  }
  else {
    res.json(ret);
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