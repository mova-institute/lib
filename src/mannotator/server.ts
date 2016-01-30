import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as actions from './api';
import * as cookieParser from 'cookie-parser';
import {tokenInfo} from '../fb_utils';
import {genAccessToken} from '../crypto';
import {query1, queryNumRows} from '../pg_utils';
import {ClientConfig} from 'pg';



export const config: ClientConfig = {
  host: 'mova.institute',
  database: 'movainstitute',
  user: 'annotator',
  password: '@nn0t@t0zh3',
  ssl: true
};

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


app.all('/api/*', async (req: Req, res) => {
  let actionName = req.params[0];
  let action = actions[actionName];
  if (action) {
    if (await authorize(actionName, req, res)) {
      try {
        await action(req, res);
      }
      catch (e) {
        console.error(e.stack);
        sendError(res, 500);
      }
    }
    else {
      sendError(res, 403);
    }
  }
  else {
    sendError(res, 404);
  }
});

app.listen(8888);



let actionRoles = {
  
};




//------------------------------------------------------------------------------
function errorHandler(err, req, res: express.Response, next) {
  console.error(err);
  console.error(err.stack);
  sendError(res, 500);
};

//------------------------------------------------------------------------------
async function authorize(action: string, req: Req, res: express.Response) {
  if (action === 'login') {
    return true;
  }
  // todo

  let accessToken = req.query.accessToken || req.cookies.accessToken;
  if (accessToken) {
    return req.bag.user = await query1(config, "SELECT user_by_token($1)", [accessToken]);
  }
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