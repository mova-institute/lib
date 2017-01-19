#!/usr/bin/env node


import { createInterface } from 'readline'
import * as fs from 'fs'

import * as minimist from 'minimist'
import * as columnify from 'columnify'

import { getLibRootRelative } from '../../path.node'
import { toPercent } from '../../string_utils'



function main() {
  // const args: any = minimist(process.argv.slice(2))
  // streamSsh(args.userhost, args.path)
  let stats = {} as any
  createInterface({ input: process.stdin })
    .on('line', (line: string) => {
      let [dateStr, timeStr, user, path, document, step, action, head, dependant, relation, , oldRelation, oldDependant] = line.trim().split(/\s+/g)

      let arrowId = `${document} ${head} ${dependant}`
      if (step === 'FINISH') {
        if (action === 'deleteArc') {
          stats[arrowId] = undefined
        } else if (action === 'createArc') {
          if (oldRelation !== 'None') {
            let oldArrowId = `${document} ${head} ${oldDependant}`
            stats[oldArrowId] = undefined
          }
          if (relation !== 'punct') {
            stats[arrowId] = user
          }
        }
      }

    }).on('close', () => {
      let grandTotal = 0
      let counts = {} as any
      for (let [arrowId, user] of Object.entries(stats)) {
        if (user === undefined) {
          continue
        }
        counts[user] = counts[user] || 0
        ++counts[user]
        ++grandTotal
      }

      let nameMap = JSON.parse(fs.readFileSync(getLibRootRelative('..', 'data', 'name-map.json'), 'utf8'))
      let results = [...Object.entries(counts)]
        .sort((a, b) => b[1] - a[1])

      let percentage = toPercent(grandTotal, 20000, 0)
      results.push(
        ['', ''],
        ['ВСЬОГО', grandTotal],
        [`МЕТИ`, `${percentage}%`],
      )
      let columns = results.map(([user, count]) => ({
        name: nameMap[user] || user,
        count,
      }))

      console.log()
      console.log(columnify(columns, {
        showHeaders: false,
        config: {
          count: {
            align: 'right',
          },
        },
      }))
      console.log()
      // .map(([user, count]) => `${nameMap[user]}\t${count}`)
      // .join('\n')
      // console.log(`${results}
      // \nЗАГАЛОМ: ${grandTotal}`)
    })
}

if (require.main === module) {
  main()
}


// 2017-01-16 21:17:35,634	username	/treebank/ud2/natalia_m/	zakon_tvaryny_28	START	createArc	T36	T35	case	None	None	None	None
