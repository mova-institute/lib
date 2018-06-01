#!/usr/bin/env node

import { forEachLine } from '../utils.node'



//------------------------------------------------------------------------------
async function main() {
  try {
    let compressorA = new Compressor()
    let compressorB = new Compressor()
    await forEachLine(process.stdin, line => {
      let [l, r] = line.split('\t')
      let res = compressorA.feed(l, r)
      if (res) {
        let [a, b] = res
        res = compressorB.feed(b, a)
        if (res) {
          write(res[1], res[0])
        }
      }
    })
    let res = compressorA.flush()
    res = compressorB.feed(res[1], res[0])
    if (res) {
      write(res[1], res[0])
    }
    res = compressorB.flush()
    if (res) {
      write(res[1], res[0])
    }
  } catch (e) {
    console.error(e.stack)
  }
}

//------------------------------------------------------------------------------
class Compressor {
  private prevA: string
  private prevB: string
  private rangeStartB = ''

  feed(a: string, b: string) {
    let ret: [string, string]
    if (a === this.prevA) {
      if (this.rangeStartB === '') {
        this.rangeStartB = this.prevB
      }
    } else {
      if (this.rangeStartB === '') {
        if (this.prevA && this.prevB) {
          ret = [this.prevA, this.prevB]
        }
      } else {
        ret = [this.prevA, `${this.rangeStartB},${this.prevB}`]
        this.rangeStartB = ''
      }
    }
    this.prevA = a
    this.prevB = b
    if (ret) {
      return ret
    }
  }

  flush() {
    if (this.rangeStartB) {
      return [this.prevA, `${this.rangeStartB},${this.prevB}`]
    }
    return [this.prevA, this.prevB]
  }
}

//------------------------------------------------------------------------------
function write(left: string, right: string) {
  left = left.replace(',-1', '').replace('-1,', '')
  right = right.replace(',-1', '').replace('-1,', '')
  process.stdout.write(`${left}\t${right}\n`)
}

if (require.main === module) {
  main()
}
