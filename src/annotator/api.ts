import * as express from 'express';
import {PgClient} from '../postrges';
import {genAccessToken} from '../crypto';
import {IReq, debug, HttpError} from './server';
import {mergeXmlFragments, nextTaskStep, canDisownTask, canEditTask} from './business';
import {markConflicts, markResolveConflicts} from './business.node';
import {firstNWords} from '../nlp/utils';
import * as assert from 'assert';


// const dbProceduresAllowedToBeCalledDirectly = new Set(['assign_task_for_resolve']);

const COOKIE_CONFIG = {
  maxAge: 1000 * 3600 * 24 * 100,
  httpOnly: true,
};

////////////////////////////////////////////////////////////////////////////////
export async function callDb(req, res: express.Response, client: PgClient) {
  /*if (dbProceduresAllowedToBeCalledDirectly.has(req.query.name)) {
    let result = await client.call(req.query.name, req.user.id, ...req.query.params);
    res.json(result);
  }*/

  // todo
}

////////////////////////////////////////////////////////////////////////////////
export async function getRoles(req, res: express.Response, client: PgClient) {
  res.json(req.bag.user && req.bag.user.roles || null);
}

////////////////////////////////////////////////////////////////////////////////
export async function getInviteDetails(req, res: express.Response, client: PgClient) {
  let details = await client.call('get_invite_details', req.query.token);
  res.json(details);
}

////////////////////////////////////////////////////////////////////////////////
export async function join(req, res: express.Response, client: PgClient) {  // todo: implement uppriv, prevent underpriv

  let invite = await client.select('invite', 'token=$1', req.body.invite);
  if (!invite || invite.usedBy !== null) {
    throw new HttpError(400);
  }

  let login = await client.select('login', 'auth_id=$1', req.user.sub);
  let personId;
  let accessToken;
  if (login) {
    if (!login.accessToken) {
      login.accessToken = await genAccessToken();
      await client.update('login', 'access_token=$1', 'id=$2', login.accessToken, login.id);
    }
    res.cookie('accessToken', login.accessToken, COOKIE_CONFIG);
  }
  else {
    personId = await client.insert('person', {
      nameFirst: req.body.profile.given_name,
      nameLast: req.body.profile.family_name,
    }, 'id');

    accessToken = await genAccessToken();
    await client.insert('login', {
      id: personId,
      accessToken,
      authId: req.user.sub,
      auth0Profile: req.body.profile,
    });
    res.cookie('accessToken', accessToken, COOKIE_CONFIG);
  }
  personId = personId || login.id;
  accessToken = accessToken || login.accessToken;
  await client.insertIfNotExists('appuser', {
    id: personId,
  });

  await client.insert('project_user', {
    projectId: invite.projectId,
    userId: personId,
    role: invite.role,
  });

  await client.update('invite', 'used_by=$1', 'token=$2', personId, req.body.invite);

  let user = await client.call('get_user_by_token', accessToken);

  res.json(user.roles);
}

////////////////////////////////////////////////////////////////////////////////
export async function login(req, res: express.Response, client: PgClient) {
  let login = await client.select('login', 'auth_id=$1', req.user.sub);
  if (!login) {
    throw new HttpError(403);
  }

  if (!login.accessToken) {
    login.accessToken = await genAccessToken();
    await client.update('login', 'access_token=$1', 'id=$2', login.accessToken, login.id);
  }
  let user = await client.call('get_user_by_token', login.accessToken);

  res.cookie('accessToken', login.accessToken, COOKIE_CONFIG).json(user.roles);
}

////////////////////////////////////////////////////////////////////////////////
export async function logout(req: IReq, res: express.Response, client: PgClient) {
  res.clearCookie('accessToken').json('ok');
}

////////////////////////////////////////////////////////////////////////////////
export async function checkDocName(req: IReq, res: express.Response, client: PgClient) {
  if (req.bag.user.roles[req.query.projectName] !== 'supervisor') {
    throw new HttpError(400);
  }
  let projectId = client.select1('project', 'id', 'name=$1', req.query.projectName);
  let isFree = client.call('is_doc_name_free', 1, req.query.value, projectId);
  res.json({ isFree });
}

////////////////////////////////////////////////////////////////////////////////
export async function addText(req: IReq, res: express.Response, client: PgClient) {  // todo
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
      content: fragment.xmlstr,
    });
  }

  let numFragments = req.body.fragments.length;
  let segments = [[0, 0]];
  for (let i = 0; i < numFragments - 1; ++i) {
    segments.push([i, i + 1]);
  }
  segments.push([numFragments - 1, numFragments - 1]);

  for (let segment of segments) {
    let taskId = await client.insert('task', {
      docId,
      type: ['disambiguate_morphologically'],
      fragmentStart: segment[0],
      fragmentEnd: segment[1],
      name: req.body.fragments[segment[0]].firstWords.join(' '),
    }, 'id');

    for (let i = segment[0]; i <= segment[1]; ++i) {
      await client.insert('fragment_version', {
        docId,
        taskId,
        index: i,
        content: req.body.fragments[i].xmlstr,
      });
    }
  }

  res.json({ result: 'ok' });
}

////////////////////////////////////////////////////////////////////////////////
export async function assignTask(req: IReq, res: express.Response, client: PgClient) {  // todo: rename +forAnnotation?
  if (!req.bag.user.roles[req.query.projectName]) {
    throw new HttpError(400);
  }

  let projectId = await client.select1('project', 'id', 'name=$1', req.query.projectName);
  let id = await client.call('assign_task_for_annotation', req.bag.user.id, projectId);

  res.json(wrapData(id));
}

////////////////////////////////////////////////////////////////////////////////
export async function assignResolveTask(req: IReq, res: express.Response, client: PgClient) {
  if (!(await client.call('assign_task_for_resolve', req.bag.user.id, req.query.id))) {
    throw new HttpError(400);
  }

  let ret = await client.call('get_task', req.bag.user.id, req.query.id);
  res.json(wrapData(ret));
}

////////////////////////////////////////////////////////////////////////////////
export async function disownTask(req: IReq, res: express.Response, client: PgClient) {
  let task = await client.call('get_task', req.bag.user.id, req.query.id);
  if (!canDisownTask(task)) {
    throw new HttpError(400);
  }
  await client.call('disown_task', req.query.id);

  res.json('ok');
}

////////////////////////////////////////////////////////////////////////////////
export async function getResolvePool(req: IReq, res: express.Response, client: PgClient) {
  let ret = await client.call('get_resolve_pool', req.bag.user.id);
  res.json(wrapData(ret));
}

////////////////////////////////////////////////////////////////////////////////
export async function getTaskList(req: IReq, res: express.Response, client: PgClient) {
  let ret = await client.call('get_task_list', req.bag.user.id, req.query.step, null);
  res.json(wrapData(ret));
}

////////////////////////////////////////////////////////////////////////////////
export async function getTaskCount(req: IReq, res: express.Response, client: PgClient) {
  let ret = await client.call('get_task_count', req.bag.user.id);
  res.json(wrapData(ret));
}

////////////////////////////////////////////////////////////////////////////////
export async function getTask(req: IReq, res: express.Response, client: PgClient) {
  let ret = await client.call('get_task', req.bag.user.id, req.query.id);
  if (ret) {
    ret.content = mergeXmlFragments(ret.fragments.map(x => x.content));
    delete ret.fragments;
  }
  res.json(wrapData(ret));
}

////////////////////////////////////////////////////////////////////////////////
export async function saveTask(req: IReq, res: express.Response, client: PgClient) {
  let ret: any = { msg: 'ok' };

  let taskInDb = await client.call('get_task', req.bag.user.id, req.body.id);
  if (!canEditTask(taskInDb) || req.body.fragments.length !== taskInDb.fragments.length) {
    throw new HttpError(400);
  }

  for (let [i, fragment] of req.body.fragments.entries()) {
    await client.insert('fragment_version', {
      taskId: req.body.id,
      docId: taskInDb.docId,
      index: taskInDb.fragmentStart + i,
      status: 'in_progress',
      content: fragment,
    });
  }

  if (req.body.complete) {
    let tocheck = await client.call('complete_task', req.body.id);
    debug(JSON.stringify(tocheck, null, 2));

    for (let task of tocheck) {

      if (taskInDb.step === 'review') {
        await onReviewConflicts(task, client);
      }
      else {
        let markedFragments = [];
        let diffsTotal = 0;
        for (let fragment of task.fragments) {
          assert.equal(fragment.annotations[0].userId, task.userId, 'wrong sort in array of conflicts');
          let [mine, theirs] = fragment.annotations;
          let {marked, numDiffs} = markConflicts(taskInDb.step, mine.content, theirs.content);
          markedFragments.push(marked);
          diffsTotal += numDiffs;
        }

        if (diffsTotal) {
          let taskToReview = await client.select('task', 'id=$1', task.taskId);
          let reviewTaskId = await client.insert('task', {
            docId: task.docId,
            userId: task.userId,
            type: ['disambiguate_morphologically'],  // todo
            step: nextTaskStep(taskToReview.step),
            fragmentStart: taskToReview.fragmentStart,
            fragmentEnd: taskToReview.fragmentEnd,
            name: taskToReview.name,
          }, 'id');

          for (let [i, fragment] of markedFragments.entries()) {
            await client.insert('fragment_version', {
              taskId: reviewTaskId,
              docId: task.docId,
              index: taskToReview.fragmentStart + i,
              status: 'pristine',
              content: fragment,
            });
          }
        }
      }
    }
  }


  if (req.body.grabNext) {
    let projectId = await client.select1('document', 'project_id', 'id=$1', taskInDb.docId);
    let reviewTasks: any[] = await client.call('get_task_list', req.bag.user.id, 'review', null);
    let nextTaskId;
    if (reviewTasks.length) {  // todo: take review from current project if can
      let doc = (reviewTasks.find(x => x.projectId === projectId) || reviewTasks[0]).documents[0];
      nextTaskId = doc.tasks[0].id;
    }
    else {
      nextTaskId = await client.call('assign_task_for_annotation', req.bag.user.id, projectId);
    }

    ret.data = nextTaskId || null;
  }

  res.json(ret);
}




//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
async function onReviewConflicts(task, client: PgClient) {

  for (let fragment of task.fragments) {
    assert.equal(fragment.annotations[0].userId, task.userId, 'wrong sort in array of conflicts');

    let [his, her] = fragment.annotations;
    let hisName = his.userId + ':' + (await client.call('get_user_details', his.userId)).nameLast;
    let herName = her.userId + ':' + (await client.call('get_user_details', her.userId)).nameLast;
    let {markedStr, markedDoc, numDiffs} = markResolveConflicts(hisName, his.content, herName, her.content);

    if (numDiffs) {
      // console.error(marked);
      let alreadyTask = await client.select('task', "doc_id=$1 and fragment_start=$2 and step='resolve'",
        task.docId, fragment.index);
      if (!alreadyTask) {

        let newTaskId = await client.insert('task', {
          docId: task.docId,
          type: ['disambiguate_morphologically'],  // todo, test
          step: 'resolve',
          fragmentStart: fragment.index,
          fragmentEnd: fragment.index,
          name: firstNWords(4, markedDoc.root).join(' '),
        }, 'id');

        await client.insert('fragment_version', {
          taskId: newTaskId,
          docId: task.docId,
          index: fragment.index,
          status: 'pristine',
          content: markedStr,
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
