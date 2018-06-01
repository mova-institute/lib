import * as pg from 'pg'
import { Request, Response } from 'express'

import { PgClient } from '../postrges'
import { sendError } from './utils'



////////////////////////////////////////////////////////////////////////////////
export async function pgTransactionWrap(action, config: pg.ClientConfig, req: Request, res: Response) {
  try {
    await PgClient.transaction(config, async (client) => {
      // if (!(await preauth(actionName, req, client))) {
      //   throw new HttpError(403)
      // }
      await action(req, res, client)
    })
  } catch (e) {
    console.error(e.stack)
    // if (e instanceof HttpError) {
    //   sendError(res, e.code, e.message)
    // }
    // else {
    sendError(res, 500)
    // }
  }
}
