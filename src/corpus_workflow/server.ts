import * as express from 'express'
import * as bodyParser from 'body-parser'
import * as Actions from './actions'
const args = require('minimist')(process.argv.slice(2))


let app = express()
app.disable('x-powered-by')
app.disable('etag')
app.set('json spaces', 2)
app.use(bodyParser.json({ limit: '50mb' }))


app.all(/\/(\w+)(\/.*)?/, (req: express.Request, res: express.Response) => {
  // console.log(req.params)
  let actionName = req.params[0]
  if (actionName in Actions) {
    let input = Object.assign({}, req.body, req.query)
    // console.error(req.body)
    let output = Actions[actionName](input)
    res.json({
      data: output,
    })
    // res.json(output)
  }
  else {
    throw new Error()
  }
})

app.listen(args.p || args.port || 8888)
