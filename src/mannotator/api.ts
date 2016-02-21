import * as express from 'express';
import {query1, transaction, BUSINESS_ERROR, PgClient} from '../postrges';
import {genAccessToken} from '../crypto';
import {config, Req, sendError, debug} from './server';
import {MAX_CONCUR_ANNOT, mergeXmlFragments, nextTaskType} from './business';
import {markConflicts, markResolveConflicts} from './business.node';
import {firstNWords} from '../nlp/utils';
import * as assert from 'assert';



const COOKIE_CONFIG = {
  maxAge: 1000 * 3600 * 24 * 100,
  httpOnly: true
};

////////////////////////////////////////////////////////////////////////////////
export async function getRole(req, res: express.Response) {
  res.json(req.bag.user && req.bag.user.role || null);
}

////////////////////////////////////////////////////////////////////////////////
export async function join(req, res: express.Response) {
  let result = await transaction(config, async (client) => {
    
    let invite = await client.select('invite', 'token=$1', req.body.invite);
    if (!invite || invite.usedBy !== null) {  // todo: throw?
      return BUSINESS_ERROR;
    }

    let login = await client.select('login', 'auth_id=$1', req.user.sub);
    if (!login) {
      var personId = await client.insert('person', {
        nameFirst: req.body.profile.given_name,
        nameLast: req.body.profile.family_name,
      }, 'id');

      var accessToken = await genAccessToken();
      await client.insert('login', {
        id: personId,
        accessToken,
        authId: req.user.sub,
        auth0Profile: req.body.profile
      });
      res.cookie('accessToken', accessToken, COOKIE_CONFIG)
    }
    personId = personId || login.id;
    await client.insertIfNotExists('appuser', {
      id: personId
    });
    
    await client.insert('project_user', {
      projectId: invite.projectId,
      userId: personId,
      role: invite.role
    });
    
    await client.update('invite', 'used_by=$1', 'token=$2', personId, req.body.invite);

    res.json(invite.role);
  });

  if (result === BUSINESS_ERROR) {
    sendError(res, 400);
  }
}

////////////////////////////////////////////////////////////////////////////////
export async function login(req, res: express.Response) {
  let result = await transaction(config, async (client) => {
    let login = await client.select('login', 'auth_id=$1', req.user.sub);
    if (!login) {
      return BUSINESS_ERROR;
    }
    
    if (!login.accessToken) {
      login.accessToken = await genAccessToken();
      await client.update('login', 'access_token=$1', 'id=$2', login.accessToken, login.id);
    }
    let role = (await client.select('project_user', 'user_id=$1', login.id)).role;

    res.cookie('accessToken', login.accessToken, COOKIE_CONFIG).json(role);
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
    let docId = await client.insert('document', {
      name: req.body.name,
      content: req.body.content,
      createdBy: req.bag.user.id,
      projectId: 1,  // todo
    }, 'id');

    for (let [i, fragment] of req.body.fragments.entries()) {
      await client.insert('fragment_version', {
        docId,
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
        docId,
        type: 'annotate',
        fragmentStart: segment[0],
        fragmentEnd: segment[1],
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
        taskId: req.body.id,
        docId: taskInDb.docId,
        index: taskInDb.fragmentStart + i,
        status: 'in_progress',
        addedAt: now,
        content: fragment
      });
    }

    if (req.body.complete) {
      let tocheck = await client.call('complete_task', req.body.id);
      debug(JSON.stringify(tocheck, null, 2));

      for (let task of tocheck) {

        if (taskInDb.type === 'review') {
          await onReviewConflicts(task, now, client);
        }
        else {
          let markedFragments = [];
          let diffsTotal = 0;
          for (let fragment of task.fragments) {
            assert.equal(fragment.annotations[0].userId, task.userId, 'wrong sort in array of conflicts');
            let [mine, theirs] = fragment.annotations;
            let {marked, numDiffs} = markConflicts(taskInDb.type, mine.content, theirs.content);
            markedFragments.push(marked);
            diffsTotal += numDiffs;
          }

          if (diffsTotal) {
            let taskToReview = await client.select('task', 'id=$1', task.taskId);
            let reviewTaskId = await client.insert('task', {
              docId: task.docId,
              userId: task.userId,
              type: nextTaskType(taskToReview.type),
              fragmentStart: taskToReview.fragmentStart,
              fragmentEnd: taskToReview.fragmentEnd,
              name: taskToReview.name
            }, 'id');

            for (let [i, fragment] of markedFragments.entries()) {
              await client.insert('fragment_version', {
                taskId: reviewTaskId,
                docId: task.docId,
                index: taskToReview.fragmentStart + i,
                status: 'pristine',
                addedAt: now,
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
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
async function onReviewConflicts(task, now: Date, client: PgClient) {

  for (let fragment of task.fragments) {
    assert.equal(fragment.annotations[0].userId, task.userId, 'wrong sort in array of conflicts');

    let [his, her] = fragment.annotations;
    let hisName = his.userId + ':' + (await client.call('get_user_details', his.userId)).nameLast;
    let herName = her.userId + ':' + (await client.call('get_user_details', her.userId)).nameLast;
    let {markedStr, markedDoc, numDiffs} = markResolveConflicts(hisName, his.content, herName, her.content);

    if (numDiffs) {
      // console.error(marked);
      let alreadyTask = await client.select('task', "doc_id=$1 and fragment_start=$2 and type='resolve'",
        task.docId, fragment.index)
      if (!alreadyTask) {

        let newTaskId = await client.insert('task', {
          docId: task.docId,
          type: 'resolve',
          fragmentStart: fragment.index,
          fragmentEnd: fragment.index,
          name: firstNWords(4, markedDoc.documentElement).join(' ')
        }, 'id');

        await client.insert('fragment_version', {
          taskId: newTaskId,
          docId: task.docId,
          index: fragment.index,
          status: 'pristine',
          addedAt: now,
          content: markedStr
        });
      }
      else {
        console.error('task exists: ' + alreadyTask.id);
      }
    }
  }
}

//------------------------------------------------------------------------------
function wrapData(data) {
  return { data };
}