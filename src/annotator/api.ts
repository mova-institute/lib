import * as express from 'express'
import { PgClient } from '../postrges'
import { genAccessToken } from '../crypto'
import { IReq, debug, HttpError } from './server'
import { mergeXmlFragments, nextTaskStep, canDisownTask, canEditTask } from './business'
import { markConflicts, markResolveConflicts, adoptMorphDisambsStr } from './business.node'
import { firstNWords, morphReinterpretGently, morphReinterpret, keepDisambedOnly } from '../nlp/utils'
import { NS, encloseInRootNs } from '../xml/utils'
import * as assert from 'assert'
import * as columnify from 'columnify'
import { parseXml } from '../xml/utils.node'
import { createMorphAnalyzerSync } from '../nlp/morph_analyzer/factories.node'
import { getLibRootRelative } from '../path.node'



// const dbProceduresAllowedToBeCalledDirectly = new Set(['assign_task_for_resolve'])
let analyzer = createMorphAnalyzerSync(getLibRootRelative('../data/dict/vesum'))
  .setExpandAdjectivesAsNouns()

const COOKIE_CONFIG = {
  maxAge: 1000 * 3600 * 24 * 100,
  httpOnly: true,
}

////////////////////////////////////////////////////////////////////////////////
export async function callDb(req, res: express.Response, client: PgClient) {
  /*if (dbProceduresAllowedToBeCalledDirectly.has(req.query.name)) {
   let result = await client.call(req.query.name, req.user.id, ...req.query.params)
   res.json(result)
   }*/

  // todo
}

////////////////////////////////////////////////////////////////////////////////
export async function getRoles(req, res: express.Response, client: PgClient) {
  res.json(req.bag.user && req.bag.user.roles || null)
}

////////////////////////////////////////////////////////////////////////////////
export async function getInviteDetails(req, res: express.Response, client: PgClient) {
  let details = await client.call('get_invite_details', req.query.token)
  res.json(details)
}

////////////////////////////////////////////////////////////////////////////////
export async function join(req, res: express.Response, client: PgClient) {  // todo: implement uppriv, prevent underpriv

  let invite = await client.select('invite', 'token=$1', req.body.invite)
  if (!invite || invite.usedBy !== null) {
    throw new HttpError(400)
  }

  let login = await client.select('login', 'auth_id=$1', req.user.sub)
  let personId
  let accessToken
  if (login) {
    if (!login.accessToken) {
      login.accessToken = await genAccessToken()
      await client.update('login', 'access_token=$1', 'id=$2', login.accessToken, login.id)
    }
    res.cookie('accessToken', login.accessToken, COOKIE_CONFIG)
  }
  else {
    personId = await client.insert('person', {
      nameFirst: req.body.profile.given_name,
      nameLast: req.body.profile.family_name,
    }, 'id')

    accessToken = await genAccessToken()
    await client.insert('login', {
      id: personId,
      accessToken,
      authId: req.user.sub,
      auth0Profile: req.body.profile,
    })
    res.cookie('accessToken', accessToken, COOKIE_CONFIG)
  }
  personId = personId || login.id
  accessToken = accessToken || login.accessToken
  await client.insertIfNotExists('appuser', {
    id: personId,
  })

  await client.insert('project_user', {
    projectId: invite.projectId,
    userId: personId,
    role: invite.role,
  })

  await client.update('invite', 'used_by=$1', 'token=$2', personId, req.body.invite)

  let user = await client.call('get_user_by_token', accessToken)

  res.json(user.roles)
}

////////////////////////////////////////////////////////////////////////////////
export async function login(req, res: express.Response, client: PgClient) {
  let login = await client.select('login', 'auth_id=$1', req.user.sub)
  if (!login) {
    throw new HttpError(403)
  }

  if (!login.accessToken) {
    login.accessToken = await genAccessToken()
    await client.update('login', 'access_token=$1', 'id=$2', login.accessToken, login.id)
  }
  let user = await client.call('get_user_by_token', login.accessToken)

  res.cookie('accessToken', login.accessToken, COOKIE_CONFIG).json(user.roles)
}

////////////////////////////////////////////////////////////////////////////////
export async function logout(req: IReq, res: express.Response, client: PgClient) {
  res.clearCookie('accessToken').json('ok')
}

////////////////////////////////////////////////////////////////////////////////
export async function checkDocName(req: IReq, res: express.Response, client: PgClient) {
  if (req.bag.user.roles[req.query.projectName] !== 'supervisor') {
    throw new HttpError(400)
  }
  // let projectId = await client.select1('project', 'id', 'name=$1', req.query.projectName)
  // let isFree = await client.call('is_doc_name_free', 1, req.query.value, projectId)
  res.json({ isFree: false })
}

////////////////////////////////////////////////////////////////////////////////
export async function addText(req: IReq, res: express.Response, client: PgClient) {  // todo
  let projectId = await client.select1('project', 'id', 'name=$1', req.body.projectName)
  if (projectId === null) {
    throw new HttpError(400)
  }
  let root = parseXml(req.body.content)
  if (root.evaluateBoolean('boolean(//mi:w[not(@n)])', NS)) {
    throw new HttpError(400, 'Not all words are numerated')
  }
  // morphInterpret(root, analyzer)

  let docId = await client.insert('document', {
    name: req.body.name,
    content: req.body.content,  //root.serialize(),
    createdBy: req.bag.user.id,
    projectId,
  }, 'id')

  for (let [i, fragment] of req.body.fragments.entries()) {
    await client.insert('fragment_version', {
      docId,
      index: i,
      content: fragment.xmlstr,
    })
  }

  let numFragments = req.body.fragments.length
  let segments = []
  if (req.body.overlap) {
    segments.push([0, 0])
    for (let i = 0; i < numFragments - 1; ++i) {
      segments.push([i, i + 1])
    }
    segments.push([numFragments - 1, numFragments - 1])
  } else {
    for (let i = 0; i < numFragments; ++i) {
      segments.push([i, i], [i, i])
    }
  }


  for (let segment of segments) {
    let taskId = await client.insert('task', {
      docId,
      type: ['disambiguate_morphologically'],
      fragmentStart: segment[0],
      fragmentEnd: segment[1],
      name: req.body.fragments[segment[0]].firstWords.join(' '),
    }, 'id')

    for (let i = segment[0]; i <= segment[1]; ++i) {
      await client.insert('fragment_version', {
        docId,
        taskId,
        index: i,
        content: req.body.fragments[i].xmlstr,
      })
    }
  }

  res.json({ result: 'ok' })
}

////////////////////////////////////////////////////////////////////////////////
export async function assignTask(req: IReq, res: express.Response, client: PgClient) {  // todo: rename +forAnnotation?
  if (!req.bag.user.roles[req.query.projectName]) {
    throw new HttpError(400)
  }

  let projectId = await client.select1('project', 'id', 'name=$1', req.query.projectName)
  let id = await client.call('assign_task_for_annotation', req.bag.user.id, projectId)

  res.json(wrapData(id))
}

////////////////////////////////////////////////////////////////////////////////
export async function assignResolveTask(req: IReq, res: express.Response, client: PgClient) {
  if (!(await client.call('assign_task_for_resolve', req.bag.user.id, req.query.id))) {
    throw new HttpError(400)
  }

  let ret = await client.call('get_task', req.bag.user.id, req.query.id)
  res.json(wrapData(ret))
}

////////////////////////////////////////////////////////////////////////////////
export async function disownTask(req: IReq, res: express.Response, client: PgClient) {
  let task = await client.call('get_task', req.bag.user.id, req.query.id)
  if (!canDisownTask(task)) {
    throw new HttpError(400)
  }
  await client.call('disown_task', req.query.id)

  res.json('ok')
}

////////////////////////////////////////////////////////////////////////////////
export async function getResolvePool(req: IReq, res: express.Response, client: PgClient) {
  let ret = await client.call('get_resolve_pool', req.bag.user.id)
  res.json(wrapData(ret))
}

////////////////////////////////////////////////////////////////////////////////
export async function getTaskList(req: IReq, res: express.Response, client: PgClient) {
  let ret = await client.call('get_task_list', req.bag.user.id, req.query.step, null)
  res.json(wrapData(ret))
}

////////////////////////////////////////////////////////////////////////////////
export async function getTaskCount(req: IReq, res: express.Response, client: PgClient) {
  let ret = await client.call('get_task_count', req.bag.user.id)
  res.json(wrapData(ret))
}

////////////////////////////////////////////////////////////////////////////////
export async function getTask(req: IReq, res: express.Response, client: PgClient) {
  let task = await client.call('get_task', req.bag.user.id, req.query.id)
  if (task) {
    task.content = mergeXmlFragments(task.fragments.map(x => x.content))
    delete task.fragments

    if (isReinterpNeeded(task)) {
      let root = parseXml(task.content)
      if (task.step === 'annotate') {
        morphReinterpret([...root.evaluateElements('//mi:w_|//w[not(ancestor::mi:w_)]', NS)], analyzer)
      } else {
        morphReinterpretGently(root, analyzer)
      }
      task.content = root.serialize()
    }

  }
  res.json(wrapData(task))
}

////////////////////////////////////////////////////////////////////////////////
export async function saveTask(req: IReq, res: express.Response, client: PgClient) {
  let ret: any = { msg: 'ok' }

  let taskInDb = await client.call('get_task', req.bag.user.id, req.body.id)
  if (!canEditTask(taskInDb) || req.body.fragments.length !== taskInDb.fragments.length) {
    throw new HttpError(400)
  }

  for (let [i, fragment] of req.body.fragments.entries()) {
    await client.insert('fragment_version', {
      taskId: req.body.id,
      docId: taskInDb.docId,
      index: taskInDb.fragmentStart + i,
      status: 'in_progress',
      content: fragment,
    })
  }

  if (req.body.complete) {
    let tocheck = await client.call('complete_task', req.body.id)
    debug(JSON.stringify(tocheck, null, 2))

    for (let task of tocheck) {

      if (taskInDb.step === 'review') {
        await onReviewConflicts(task, client)
      }
      else if (taskInDb.step === 'resolve') {
      }
      else {
        let markedFragments = []
        let diffsTotal = 0
        for (let fragment of task.fragments) {
          assert.equal(fragment.annotations[0].userId, task.userId, 'wrong sort in array of conflicts')
          let [mine, theirs] = fragment.annotations
          let { marked, numDiffs } = markConflicts(taskInDb.step, mine.content, theirs.content)
          markedFragments.push(marked)
          diffsTotal += numDiffs
        }

        if (diffsTotal) {
          let taskToReview = await client.select('task', 'id=$1', task.taskId)
          let reviewTaskId = await client.insert('task', {
            docId: task.docId,
            userId: task.userId,
            type: ['disambiguate_morphologically'],  // todo
            step: nextTaskStep(taskToReview.step),
            fragmentStart: taskToReview.fragmentStart,
            fragmentEnd: taskToReview.fragmentEnd,
            name: taskToReview.name,
          }, 'id')

          for (let [i, fragment] of markedFragments.entries()) {
            await client.insert('fragment_version', {
              taskId: reviewTaskId,
              docId: task.docId,
              index: taskToReview.fragmentStart + i,
              status: 'pristine',
              content: fragment,
            })
          }
        }
      }
    }
  }


  if (req.body.grabNext) {
    let projectId = await client.select1('document', 'project_id', 'id=$1', taskInDb.docId)
    let reviewTasks: any[] = await client.call('get_task_list', req.bag.user.id, 'review', null)
    let nextTaskId
    if (reviewTasks.length) {  // todo: take review from current project if can
      let doc = (reviewTasks.find(x => x.projectId === projectId) || reviewTasks[0]).documents[0]
      nextTaskId = doc.tasks[0].id
    }
    else {
      nextTaskId = await client.call('assign_task_for_annotation', req.bag.user.id, projectId)
    }

    ret.data = nextTaskId || null
  }

  res.json(ret)
}

////////////////////////////////////////////////////////////////////////////////
export async function getAnnotatedDoc(req: IReq, res: express.Response, client: PgClient) {
  // todo: credentials
  let originalXml = await client.select1('document', 'content', 'id=$1', req.query.id)
  if (!originalXml) {
    throw new HttpError(404)
  }
  let docRoot = parseXml(originalXml)
  let docs = await client.call('get_document_latest_state', req.query.id)
  res.setHeader('Content-Type', 'application/xml')
  try {
    for (let doc of docs) {
      for (let task of doc.taskTypes) {
        if (task.type[0] === 'disambiguate_morphologically') {
          let latestFragments = task.fragments
            .filter(x => x.isDone)
            .map(x => x.latestAnnotations.find(xx => xx.step === 'resolve')
              || x.latestAnnotations.find(xx => xx.step === 'review')
              || x.latestAnnotations.find(xx => xx.step === 'annotate'))
            .map(x => x.content)
          try {
            // throw new Error('Words are not numerated')
            latestFragments.forEach(x => adoptMorphDisambsStr(docRoot, x))
          } catch (e) {
            if (e.message === 'Words are not numerated') {
              docRoot = parseXml(encloseInRootNs(latestFragments.join('\n')))
              keepDisambedOnly(docRoot)
            } else {
              throw e
            }
          }
        }
      }
    }
    return res.end(docRoot.document().serialize(true))
  } catch (e) {  // somebody forgot --numerate
    // let content = '<root>'
    // for (let doc of docs) {
    //   for (let task of doc.taskTypes) {
    //     if (task.type[0] === 'disambiguate_morphologically') {
    //       for (let fragment of task.fragments.filter(x => x.isDone)) {
    //         let latestAnnotation = fragment.latestAnnotations.find(x => x.step === 'resolve')
    //           || fragment.latestAnnotations.find(x => x.step === 'review')
    //           || fragment.latestAnnotations.find(x => x.step === 'annotate')
    //         content += latestAnnotation.content
    //       }
    //     }
    //   }
    //   content += '</root>'
    //   return res.end(content)
    // }
    throw e
  }
}

////////////////////////////////////////////////////////////////////////////////
export async function getStats(req: IReq, res: express.Response, client: PgClient) {
  const QUERY = `
  select * from annotator.fragment_version
  join annotator.task on fragment_version.task_id=task.id
  join common.person on task.user_id = person.id
  where task.step='annotate' and fragment_version.status='done'
  `
  let rows = (await client.query(QUERY)).rows
  let stats = {} as any
  for (let {content, name_last} of rows) {
    stats[name_last] = stats[name_last] || { count: 0 }
    let numWords = parseXml(encloseInRootNs(content)).evaluateNumber('count(//*[local-name()="w_"]|//mi:w_)', NS)
    // console.log(numWords)
    stats[name_last].count += numWords
  }
  let cols = Object.entries(stats).map(([user, {count}]) => ({ user, count })).sort((a, b) => b.count - a.count)
  cols.push({ user: 'TOTAL', count: cols.map(x => x.count).reduce((a, b) => a + b, 0) })
  let tosend = columnify(cols, {
    config: {
      count: {
        align: 'right',
      },
    }
  })
  res.setHeader('Content-Type', 'text/html')
  tosend = `<html><body><pre style="font-family:'Courier New';">\n${tosend}\n</pre></body></html>`
  res.end(tosend)
}

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
async function onReviewConflicts(task, client: PgClient) {

  for (let fragment of task.fragments) {
    assert.equal(fragment.annotations[0].userId, task.userId, 'wrong sort in array of conflicts')

    let [his, her] = fragment.annotations
    let hisName = his.userId + ':' + (await client.call('get_user_details', his.userId)).nameLast
    let herName = her.userId + ':' + (await client.call('get_user_details', her.userId)).nameLast
    let { markedStr, markedDoc, numDiffs } = markResolveConflicts(hisName, his.content, herName, her.content)

    if (numDiffs) {
      // console.error(marked)
      let alreadyTask = await client.select('task', "doc_id=$1 and fragment_start=$2 and step='resolve'",
        task.docId, fragment.index)
      if (!alreadyTask) {

        let newTaskId = await client.insert('task', {
          docId: task.docId,
          type: ['disambiguate_morphologically'],  // todo, test
          step: 'resolve',
          fragmentStart: fragment.index,
          fragmentEnd: fragment.index,
          name: [...firstNWords(4, markedDoc.root())].join(' '),  // todo
        }, 'id')

        await client.insert('fragment_version', {
          taskId: newTaskId,
          docId: task.docId,
          index: fragment.index,
          status: 'pristine',
          content: markedStr,
        })
      }
      else {
        console.error('task exists: ' + alreadyTask.id)
      }
    }
  }
}

//------------------------------------------------------------------------------
function wrapData(data) {
  return { data }
}

//------------------------------------------------------------------------------
function isReinterpNeeded(task) {
  return (task.step === 'annotate' || task.step === 'review')
    && task.type.find(x => x === 'disambiguate_morphologically')
}
