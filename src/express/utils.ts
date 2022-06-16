import { Response } from 'express'

export function makeErrObj(code: number, message?: string) {
  return {
    error: {
      code,
      message,
    },
  }
}

export function sendError(res: Response, code: number, message?: string) {
  res.status(code).json(makeErrObj(code, message))
}

export function sendBadRequest(res: Response) {
  return sendError(res, 400, 'Bad request.')
}
