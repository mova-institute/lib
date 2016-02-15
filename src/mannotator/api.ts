import * as express from 'express';
import {ClientConfig} from 'pg';
import {query1, queryNumRows, transaction, BUSINESS_ERROR, PgClient} from '../postrges';
import {genAccessToken} from '../crypto';
import {config, Req, sendError} from './server';
import {MAX_CONCUR_ANNOT, mergeXmlFragments, nextTaskType} from './business';
import {markConflicts, markResolveConflicts} from './business.node';
import {markWordwiseDiff} from '../nlp/utils';



const COOKIE_CONFIG = {
  maxAge: 1000 * 3600 * 24 * 100,
  httpOnly: true
};

////////////////////////////////////////////////////////////////////////////////
export async function getRole(req, res: express.Response) {
  res.json(req.bag.user && req.bag.user.annotatorRole || null);
}

////////////////////////////////////////////////////////////////////////////////
export async function login(req, res: express.Response) {
  let authId = req.user.sub;

  let result = await transaction(config, async (client) => {
    let personId = await client.select1('login', 'person_id', 'auth_id=$1', authId);
    if (personId) {
      let accessToken = await genAccessToken();
      await client.update('login', 'access_token=$1', 'person_id=$2', accessToken, personId);
      let role = (await client.select('appuser', 'person_id=$1', personId)).role;
      res.cookie('accessToken', accessToken, COOKIE_CONFIG);
      res.json(role);
    }
    else if (req.body.invite) {
      let invite = await client.select('invite', 'token=$1', req.body.invite);
      if (!invite || invite.usedBy !== null) {  // todo: throw?
        return BUSINESS_ERROR;
      }
      console.error(req.body.profile);
      personId = await client.insert('person', {
        name_first: req.body.profile.given_name,
        name_last: req.body.profile.family_name,
      }, 'id');

      let accessToken = await genAccessToken();
      await client.insert('login', {
        person_id: personId,
        access_token: accessToken,
        auth_id: authId,
        nickname: req.body.profile.nickname,
        auth0_profile: req.body.profile
      });

      await client.insert('appuser', {
        person_id: personId,
        role: invite.role
      });

      await client.update('invite', 'used_by=$1', 'token=$2', personId, req.body.invite);

      res.cookie('accessToken', accessToken, COOKIE_CONFIG).json(invite.role);
    }
    else {
      return BUSINESS_ERROR;
    }
  });

  if (result === BUSINESS_ERROR) {
    sendError(res, 403);
  }
}

////////////////////////////////////////////////////////////////////////////////
export async function logout(req: Req, res: express.Response) {
  res.clearCookie('accessToken').json('ok');
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
  if (req.query.type === 'resolve') {
    req.bag.user.id = null;  // temp, todo
  }
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
  if (ret) {
    ret.content = mergeXmlFragments(ret.fragments.map(x => x.content));
    delete ret.fragments;
  }
  res.json(wrapData(ret));
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
      console.error(JSON.stringify(tocheck, null, 2));
      for (let task of tocheck) {

        if (taskInDb.type === 'review') {
          await onReviewConflicts(task, now, client);
        }
        else {
          let markedFragments = [];
          let diffsTotal = 0;
          for (let fragment of task.fragments) {
            let [mine, theirs] = fragment.annotations;
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
async function onReviewConflicts(task, now: Date, client: PgClient) {

  for (let fragment of task.fragments) {
    let [his, her] = fragment.annotations;
    let hisName = his.userId + ':' + (await client.call('get_user_details', his.userId)).nameLast;
    let herName = her.userId + ':' + (await client.call('get_user_details', her.userId)).nameLast;
    let {marked, numDiffs} = markResolveConflicts(hisName, his.content, herName, her.content);

    if (numDiffs) {
      // console.error(marked);
      let alreadyTask = await client.select('task', "doc_id=$1 and fragment_start=$2 and type='resolve'",
        task.docId, fragment.index)
      if (!alreadyTask) {

        let newTaskId = await client.insert('task', {
          doc_id: task.docId,
          type: 'resolve',
          fragment_start: fragment.index,
          fragment_end: fragment.index,
          name: 'todo'
        }, 'id');

        await client.insert('fragment_version', {
          task_id: newTaskId,
          doc_id: task.docId,
          index: fragment.index,
          status: 'pristine',
          added_at: now,
          content: marked
        });
      }
      else console.error('task exists: ' + alreadyTask.id);
    }
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