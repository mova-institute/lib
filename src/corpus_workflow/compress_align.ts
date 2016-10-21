#!/usr/bin/env node

import { isDeceimalInt } from '../string_utils'
import { forEachLine } from '../utils.node'



if (require.main === module) {
  main()
}

//------------------------------------------------------------------------------
async function main() {
  try {
    let compresserA = compresser()
    let compresserB = compresser()
    await forEachLine(process.stdin, line => {
      let [l, r] = line.split('\t')
      let res = compresserA(l, r)
      if (res) {
        let [a, b] = res
        res = compresserB(b, a)
        if (res) {
          write(res[1], res[0])
        }
      }
    })
    let res = compresserA('')
    res = compresserB(res[1], res[0])
    write(res[1], res[0])

    // let prevL: number
    // let prevR: number
    // let curRangeStart: number
    // await forEachLine(process.stdin, line => {
    //   let [lStr, rStr] = line.split('\t')

    //   if (isDeceimalInt(lStr) && isDeceimalInt(rStr)) {
    //     let l = Number.parseInt(lStr)
    //     let r = Number.parseInt(rStr)
    //     if (prevL === l) {

    //     }
    //     prevL = l
    //     prevR = r
    //   } else if (curRangeStart === undefined) {
    //     write(lStr, rStr)
    //   } else {

    //   }
    // })
  } catch (e) {
    console.error(e.stack)
  }
}

// class Compresser {
//   prev: string
//   rangeStart: string

//   feed(a: string, b: string) {
//     if (!isInt(a)) {
//     //   if (this.rangeStart)
//     // }
//   }
// }

//------------------------------------------------------------------------------
function compresser() {
  let prevA: string
  let prevB: string
  let rangeStartB = ''
  return (a: string, b?: string) => {
    // if (!a) {
    //   return
    // }
    if (!a) {
      if (rangeStartB) {
        return [prevA, `${rangeStartB},${prevB}`]
      }
      return [prevA, prevB]
    }

    let ret: [string, string]
    if (a === prevA) {
      if (rangeStartB === '') {
        rangeStartB = prevB
      }
    } else {
      if (rangeStartB === '') {
        if (prevA && prevB) {
          ret = [prevA, prevB]
        }
      } else {
        ret = [prevA, `${rangeStartB},${prevB}`]
        rangeStartB = ''
      }
    }
    prevA = a
    prevB = b
    if (ret) {
      return ret
    }
  }
}

//------------------------------------------------------------------------------
function isInt(str: string) {
  return /^\d+$/.test(str)
}

//------------------------------------------------------------------------------
function write(left: string, right: string) {
  process.stdout.write(`${left}\t${right}\n`)
}
