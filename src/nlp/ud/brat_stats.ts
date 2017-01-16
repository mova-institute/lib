#!/usr/bin/env node

import * as minimist from 'minimist'

import { createInterface } from 'readline'



function main() {
  // const args: any = minimist(process.argv.slice(2))
  // streamSsh(args.userhost, args.path)
  let stats = {} as any
  createInterface({ input: process.stdin })
    .on('line', line => {
      let [dateStr, timeStr, user, , , start, action, head, dependant, relation] = line.split(/\s+/g)
      if ((action === 'createArc' || action === 'deleteArc') && start === 'START' && relation !== 'punct') {
        let diff = action === 'createArc' ? 1 : -1
        stats[user] = stats[user] || 0
        stats[user] += diff
      }

    }).on('close', () => {
      console.log(stats)
    })
}

if (require.main === module) {
  main()
}

// 2017-01-16 21:17:35,634	username	/treebank/ud2/natalia_m/	zakon_tvaryny_28	START	createArc	T36	T35	case	None	None	None	None