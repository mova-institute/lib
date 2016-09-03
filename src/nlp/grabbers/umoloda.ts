import { writeFile, writeFileSync } from 'fs'

const fetch = require('node-fetch')
const args = require('minimist')(process.argv.slice(2))




main()

async function main() {
  for (let i = 100001; i <= 100500; ++i) {
    let url = 'http://www.umoloda.kiev.ua/number/3010/2006/' + i
    let content = await fetch(url).then(res => res.text())
    let path = args.out + '/umoloda_3010_2006_' + i + '.html'
    console.log(`writing to ${path}`)
    writeFileSync(path, content, 'utf8')
    // writeFile(path, , x => {
    // })
  }
}
