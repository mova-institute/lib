import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as actions from './api';
import * as cookieParser from 'cookie-parser';
import {genAccessToken} from '../crypto';
import {query1} from '../postrges';
import {ClientConfig} from 'pg';
import * as debugFactory from 'debug';
const jwt = require('express-jwt');

const IS_DEV = process.env.NODE_ENV === 'development';
export const debug = debugFactory('annotator');

export const config: ClientConfig = {
  host: IS_DEV ? 'localhost' : '/var/run/postgresql',
  port: IS_DEV ? 5433 : undefined,
  database: 'mi_dev',
  user: 'annotator',
  password: '@nn0t@t0zh3',
};

const jwtCheck = jwt({
  secret: new Buffer('2P1lL3Sm1CavW2VPoZF9b-lzBDV1VQvdf_9tIaJeQ5EcLKLsd0UXCCYNA5DYKVOC', 'base64'),
  audience: '043jypMQ2KNdgkfi8FbwHjSxYNXaISWg',
  credentialsRequired: false
});

export interface Req extends express.Request {
  bag: any;
}


let app = express();
app.disable('x-powered-by');
app.disable('etag');
app.set('json spaces', 2);
app.use(cookieParser());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.text({ limit: '50mb' }));
app.use(reqBag);
app.use(errorHandler);
app.use('/api/login', jwtCheck);
app.use('/api/join', jwtCheck);


app.all('/api/*', async (req: Req, res) => {
  let actionName = req.params[0];
  let action = actions[actionName];
  if (action) {
    try {
      if (await preauth(actionName, req, res)) {
        await action(req, res);
      }
      else {
        sendError(res, 403);
      }
    }
    catch (e) {
      console.error(e.stack);
      if (e instanceof HttpError) {
        sendError(res, e.code, e.message)
      }
      else {
        sendError(res, 500);
      }
    }
  }
  else {
    sendError(res, 404);
  }
});

app.listen(8888);






//------------------------------------------------------------------------------
function errorHandler(err, req, res: express.Response, next) {
  console.error(err);
  console.error(err.stack);
  sendError(res, 500);
};

//------------------------------------------------------------------------------
async function preauth(action: string, req: Req, res: express.Response) {
  if (action === 'login' || action === 'getInviteDetails' || action === 'join') {
    return true;
  }


  let accessToken = req.query.accessToken || req.cookies.accessToken;
  if (accessToken) {
    req.bag.user = await query1(config, "SELECT get_user_by_token($1)", [accessToken]);
  }

  return req.bag.user || action === 'getRole';
}

//------------------------------------------------------------------------------
function reqBag(req, res: express.Response, next) {
  req.bag = req.bag || {};
  next();
}

////////////////////////////////////////////////////////////////////////////////
export function makeErrObj(code: number, message?: string) {
  return {
    error: {
      code,
      message
    }
  };
}

////////////////////////////////////////////////////////////////////////////////
export function sendError(res: express.Response, code: number, message?: string) {
  res.status(code).json(makeErrObj(code, message));
}

////////////////////////////////////////////////////////////////////////////////
export class HttpError extends Error {
  constructor(public code: number, public message?: string) {
    super(message);
  }
}