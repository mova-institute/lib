import * as express from 'express'
import * as bodyParser from 'body-parser'
import * as actions from './api'
import * as cookieParser from 'cookie-parser'
import { PgClient } from '../postrges'
import * as debugFactory from 'debug'
import { parseJsonFileSync } from '../utils.node'
import jwt = require('express-jwt')



export const debug = debugFactory('annotator')

export interface IReq extends express.Request {
  bag: any
}


let config = parseJsonFileSync(process.argv[3])
let jwtCheck = jwt(config.jwt)

let app = express()
app.disable('x-powered-by')
app.disable('etag')
app.set('json spaces', 2)
app.use(cookieParser())
app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.text({ limit: '50mb' }))
app.use(reqBag)
app.use(errorHandler)
app.use('/api/login', jwtCheck)
app.use('/api/join', jwtCheck)


app.all('/api/*', async (req: IReq, res: express.Response) => {
  let actionName = req.params[0]
  if (actionName in actions) {
    let action = actions[actionName]
    try {
      await PgClient.transaction(config, async (client) => {
        if (!(await preauth(actionName, req, client))) {
          throw new HttpError(403)
        }
        await action(req, res, client)
      })
    } catch (e) {
      console.error(e.stack)
      if (e instanceof HttpError) {
        sendError(res, e.code, e.message)
      } else {
        sendError(res, 500)
      }
    }
  } else {
    sendError(res, 404)
  }
})

app.listen(process.argv[2])



//------------------------------------------------------------------------------
function errorHandler(err, req, res: express.Response, next) {
  console.error(err)
  console.error(err.stack)
  sendError(res, 500)
}

//------------------------------------------------------------------------------
async function preauth(action: string, req: IReq, client: PgClient) {
  if (action === 'login' || action === 'getInviteDetails' || action === 'join') {
    return true
  }

  let accessToken = req.query.accessToken || req.cookies.accessToken
  if (accessToken) {
    req.bag.user = await client.call('get_user_by_token', accessToken)
  }

  return req.bag.user || action === 'getRoles'
}

//------------------------------------------------------------------------------
function reqBag(req, res: express.Response, next) {
  req.bag = req.bag || {}
  next()
}

////////////////////////////////////////////////////////////////////////////////
export function makeErrObj(code: number, message?: string) {
  return {
    error: {
      code,
      message,
    },
  }
}

////////////////////////////////////////////////////////////////////////////////
export function sendError(res: express.Response, code: number, message?: string) {
  res.status(code).json(makeErrObj(code, message))
}

////////////////////////////////////////////////////////////////////////////////
export class HttpError extends Error {
  constructor(public code: number, public message = '') {
    super(message)
  }
}
