import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as actions from './api';
import * as cookieParser from 'cookie-parser';
import {tokenInfo} from '../fb_utils';
import {genAccessToken} from '../crypto';
import {queryScalar, queryNumRows} from '../pg_utils';
import {ClientConfig} from 'pg';



export const config: ClientConfig = {
  host: 'localhost',
  database: 'movainstitute',
  user: 'movainstitute',
  password: 'movainstituteP@ss'
};




let app = express();

app.disable('x-powered-by');
app.use(cookieParser());
// app.use(bodyParser.json());
app.use(bodyParser.text({ limit: '50mb' }));
app.use(reqBagMiddleware);
app.use(loginMiddleware);
app.use(allowOrigin);
//app.use(errorHandler);  // what for?


app.all('/api/*', async (req, res) => {
  let action = actions[req.params[0]];
  if (action) {
    if (true /*todo: authorize*/) {
      try {
        await action(req, res);
      }
      catch (e) {
        console.error(e.stack);
      }
    }
    else {
      res.status(403).end('403');
    }
  }
  else {
    res.status(404).end('404');
  }
});

app.listen(8888);








//------------------------------------------------------------------------------
function allowOrigin(req, res: express.Response, next) {
  // res.header('Access-Control-Allow-Headers', 'Content-Type');
  // res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:3000');
  res.header('Access-Control-Allow-Origin', '*');
  // res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  next();
}

/*//------------------------------------------------------------------------------
function errorHandler(err, req, res, next) {
  console.error(err);
  console.error(err.stack);
  res.status(500).send('Something broke!');
};*/

//------------------------------------------------------------------------------
async function loginMiddleware(req, res: express.Response, next) {
  if (req.query.action === 'login') {
    return next();
  }

  let accessToken = req.query.accessToken || req.cookies.accessToken;
  if (accessToken) {
    req.bag.annotatorRole = await queryScalar(config, 'SELECT annotator_user.role FROM annotator_user' +
      ' JOIN login ON annotator_user.person_id=login.person_id WHERE access_token=$1', [accessToken]);
  }
  next();
}

////////////////////////////////////////////////////////////////////////////////
function reqBagMiddleware(req, res: express.Response, next) {
  req.bag = req.bag || {};
  next();
}