import { PgClient } from '../postrges'
import { genAccessToken } from '../crypto'
import { parseJsonFileSync } from '../utils.node'
import { pgTransactionWrap } from '../lib/express/pg'
import { sendError } from '../lib/express/utils'

import * as minimist from 'minimist'
import * as express from 'express'
import { Request, Response, CookieOptions } from 'express'
import * as cookieParser from 'cookie-parser'
import * as passport from 'passport'
import { OAuth2Strategy as GoogleStrategy } from 'passport-google-oauth'
import { WebvectorClient } from './webvector_client'
import { vectorHandlers, VectorConfig } from './vector_handlers'



////////////////////////////////////////////////////////////////////////////////
export interface Config {
  port: number
  webvector: VectorConfig
  postgres: {
    host: string
    database: string
    user: string
    password: string
  }
  google: {
    clientID: string
    clientSecret: string
  }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
const AUTH_COOKIE = 'accessToken'
const CONTINUETO_COOKIE = 'continueTo'
const globalCookie: CookieOptions = {
  domain: '.mova.institute',
  maxAge: 1000 * 3600 * 24 * 100,
}
const apiCookie: CookieOptions = {
  domain: 'api.mova.institute',
  maxAge: 1000 * 3600 * 24 * 100,
}
const httponlyGlobalCookie: CookieOptions = {
  ...globalCookie,
  httpOnly: true,
  domain: '.mova.institute',
}
const httponlyApiCookie: CookieOptions = {
  ...apiCookie,
  httpOnly: true,
  domain: 'api.mova.institute',
}
const authCookieOptions = httponlyGlobalCookie
const continuetoCookieOptions = httponlyApiCookie

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
let actions: { [key: string]: (req: Request, res: Response, client: PgClient) => void } = {
  logout(req, res, client) {
    res.clearCookie(AUTH_COOKIE, globalCookie)
    if (req.query[CONTINUETO_COOKIE]) {
      res.redirect(req.query[CONTINUETO_COOKIE])
    } else {
      res.json({ message: 'ok' })
    }
  },
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function main() {
  let params = minimist(process.argv.slice(2))
  let config = parseJsonFileSync(process.argv[2]) as Config

  bakeGooglePassport(passport, config.google)
  let vebvectorClient = new WebvectorClient(config.webvector.port, config.webvector.host)

  let app = express()
  app.disable('x-powered-by')
    .disable('etag')
    .set('json spaces', 2)
    .use(cookieParser())
    .use(express.json({ type: '*/*' }))
    .use(passport.initialize())
    .get('/auth/google/callback', endAuthWithGoogle(config.postgres))
    .get('/auth/google', startAuthWithGoogle)
    .all('/*', async (req, res) => {
      try {
        let [l1, l2] = req.path.substr(1).split(/\//g, 2)
        if (l1 in actions) {
          pgTransactionWrap(actions[l1], config.postgres, req, res)
        } else if (l1 === 'vectors' && (l2 in vectorHandlers)) {
          await vectorHandlers[l2](req, res, vebvectorClient, config.webvector)
        } else {
          sendError(res, 404)
        }
      } catch (e) {
        console.error(e.stack)
        sendError(res, 500)
      }
    })

  let port = params.port || config.port
  let server = app.listen(port,
    () => console.log(`mi-api listening on ${port}`))

  process.on('SIGINT', () => {
    console.error(`Shutting down gracefully…`)
    server.close()
  })
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function startAuthWithGoogle(req: Request, res: Response) {
  let continueTo = req.query[CONTINUETO_COOKIE]
  if (continueTo) {
    res.cookie(CONTINUETO_COOKIE, continueTo, continuetoCookieOptions)
  }
  passport.authenticate('google', {
    scope: ['profile', 'email'] ,
    // successRedirect: continueTo,
    // successReturnToOrRedirect: continueTo,
    // passReqToCallback: continueTo,
  })(req, res)
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function endAuthWithGoogle(pgConfig) {
  return [
    passport.authenticate('google'),
    (req: Request, res: Response) => pgTransactionWrap(authHandler, pgConfig, req, res),
  ]
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function authHandler(req: Request, res: Response, client: PgClient) {
  let authId = `google-oauth2|${req.user.id}`
  let login = await client.select('login', 'auth_id=$1', authId)
  if (login) {
    if (!login.accessToken) {
      login.accessToken = await genAccessToken()
      await client.update('login', 'access_token=$1', 'id=$2', login.accessToken, login.id)
    }
    res.cookie(AUTH_COOKIE, login.accessToken, authCookieOptions)
  } else {
    let personId = await client.insert('person', {
      nameFirst: req.user.givenName,
      nameLast: req.user.familyName,
    }, 'id')

    let accessToken = await genAccessToken()
    await client.insert('login', {
      id: personId,
      accessToken,
      authId,
      auth0Profile: req.user.raw,
    })
    res.cookie(AUTH_COOKIE, accessToken, authCookieOptions)
  }

  let continueTo = req.cookies[CONTINUETO_COOKIE]
  if (continueTo) {
    res.clearCookie(CONTINUETO_COOKIE, globalCookie)
    res.redirect(302, continueTo)
  } else {
    res.json({ message: 'ok' })
  }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function extractGoogleProfile(profile) {
  return {
    id: profile.id,
    email: profile.emails[0].value,
    displayName: profile.displayName,
    givenName: profile.name.givenName,
    familyName: profile.name.familyName,
    raw: profile._json,
  }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function bakeGooglePassport(passportInstance, config) {
  passportInstance.use(new GoogleStrategy({
    ...config,
    callbackURL: 'https://api.mova.institute/auth/google/callback',
    accessType: 'offline',
  }, (accessToken, refreshToken, profile, cb) => cb(null, extractGoogleProfile(profile))))
  passportInstance.serializeUser((user, cb) => cb(null, user))
  passportInstance.deserializeUser((obj, cb) => cb(null, obj))
}


////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}


