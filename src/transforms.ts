import { stream2lxmlRoot, filename2lxmlRootSync } from './utils.node'
import { readTillEnd } from './stream_utils.node'
import { dictFormLemmaTag } from './nlp/utils'
import { traverseDocumentOrderEl } from './xml/utils'
import { readFileSync, createWriteStream, renameSync } from 'fs'
import { join } from 'path'
import * as tmp from 'tmp'


tmp.setGracefulCleanup()
////////////////////////////////////////////////////////////////////////////////
export function ugtag2mi(input, output) {
; (async () => {
    try {
      let root = await stream2lxmlRoot(input)
      output.write(root.document().serialize())
    }
    catch (e) {
      console.error(e.stack)
    }
  })()
}

function isOpenClassTag(tag: string) {
  return tag.startsWith('N') || tag.startsWith('V') || tag.startsWith('A') || tag.startsWith('R')
}

////////////////////////////////////////////////////////////////////////////////
export function ugtag2tt(args) {
  let lines = readFileSync(args.dict, 'utf-8').trim().replace('\'', '’').split('\n')
  let map = new Map<string, Set<string>>()
  let openClassTags = new Set<string>()
  for (let line of lines) {
    if (line && !line.includes(' ')) {
      let [form, lemma, tag] = line.split(',')
      if (isOpenClassTag(tag)) {
        openClassTags.add(tag)
      }
      let set = map.has(form) ? map.get(form) : map.set(form, new Set()).get(form)
      if (![...set].some(x => x.startsWith(tag + ' '))) {
        set.add(tag + ' ' + lemma)
      }
    }
  }


  console.log('reading training data…')
  let tmpName
  let root = filename2lxmlRootSync(args.train)
  let ret = createWriteStream(tmpName = tmp.tmpNameSync())
  try {
    traverseDocumentOrderEl(root, el => {
      if (el.localName() === 'w') {
        let tag = el.attribute('ana')
        let form = el.text()
        let lemma = el.attribute('lemma')
        if (isOpenClassTag(tag)) {
          openClassTags.add(tag)
        }
        let set = map.has(form) ? map.get(form) : map.set(form, new Set()).get(form)
        if (![...set].some(x => x.startsWith(tag + ' '))) {
          set.add(tag + ' ' + lemma)
        }
        ret.write(form + '\t' + tag + '\n')
      }
      else if (el.localName() === 'c') {
        ret.write(el.text() + '\tPUN\n')
      }
    })
  }
  catch (e) {

  }
  renameSync(tmpName, join(args.ret, 'tt-train.txt'))


  tmpName = tmp.tmpNameSync()
  ret = createWriteStream(tmpName)
  for (let [form, iterpretaions] of map) {
    ret.write(form + '\t')
    ret.write([...iterpretaions].join('\t'))
    ret.write('\n')
  }
  ret.write('гарнорото\tR гарнорото\n')
  ttWriteOther(ret)
  renameSync(tmpName, join(args.ret, 'tt-lexicon.txt'))


  ret = createWriteStream(tmpName = tmp.tmpNameSync())
  ret.write([...openClassTags].join(' '))
  renameSync(tmpName, join(args.ret, 'tt-open-class-tags.txt'))
}

////////////////////////////////////////////////////////////////////////////////
export async function shevaCsv2ttLexicon(input, output) {
  let lines = (await readTillEnd(input)).trim().replace('\'', '’').split('\n')
  let map = new Map<string, Set<string>>()
  for (let line of lines) {
    if (line && !line.includes(' ')) {
      let [form, lemma, tag] = line.split(',')
      let set = map.has(form) ? map.get(form) : map.set(form, new Set()).get(form)
      if (![...set].some(x => x.startsWith(tag + ' '))) {
        set.add(tag + ' ' + lemma)
      }
    }
  }

  for (let [form, iterpretaions] of map) {
    output.write(form + '\t')
    output.write([...iterpretaions].join('\t'))
    output.write('\n')
  }

  output.write('гарнорото\tR гарнорото\n')

  ttWriteOther(output)
}

////////////////////////////////////////////////////////////////////////////////
export async function shevaCsv2ttOpenTags(input, output) {
  let lines = (await readTillEnd(input)).trim().replace('\'', '’').split('\n')
  let set = new Set<string>()
  for (let line of lines) {
    if (line && !line.includes(' ')) {
      let tag = line.split(',')[2]
      if (tag.startsWith('N') || tag.startsWith('V') || tag.startsWith('A') || tag.startsWith('R')) {
        set.add(tag)
      }
    }
  }
  output.write([...set].join(' '))
}


////////////////////////////////////////////////////////////////////////////////
export async function dict2ttLexicon(input, output) {
  let lines = (await readTillEnd(input)).split('\n')
  let map = new Map<string, Set<string>>()
  for (let { form, lemma, tag } of dictFormLemmaTag(lines)) {
    let set = map.has(form) ? map.get(form) : map.set(form, new Set()).get(form)
    if (![...set].some(x => x.startsWith(tag + ' '))) {
      set.add(tag + ' ' + lemma)
    }
  }

  for (let [form, iterpretaions] of map) {
    output.write(form + '\t')
    output.write([...iterpretaions].join('\t'))
    output.write('\n')
  }

  ttWriteOther(output)
}

function ttWriteOther(output) {
  output.write('0\tMd 0\n')
  output.write('.\tPUN .\n')
  output.write(',\tPUN ,\n')
  output.write('!\tPUN ,\n')
  output.write('?\tPUN ,\n')
  output.write('-\tPUN -\n')
  output.write('–\tPUN –\n')
  output.write('—\tPUN —\n')
  output.write(':\tPUN :\n')
  output.write('(\tPUN (\n')
  output.write(')\tPUN )\n')
  output.write('</s>\tSENT -')
}

////////////////////////////////////////////////////////////////////////////////
export async function tagsJson2ttOpenClass(input, output) {
  let tags: Array<string> = JSON.parse(await readTillEnd(input))
  let openClassTags = tags.filter(tag => tag.startsWith('N')
  || tag.startsWith('V') || tag.startsWith('A') || tag.startsWith('R'))
  output.write(openClassTags.join(' '))
}

////////////////////////////////////////////////////////////////////////////////
export async function kotsybaDisambed2ttTraining(input, output) {
  try {
    let root = await stream2lxmlRoot(input)
    traverseDocumentOrderEl(root, el => {
      if (el.localName() === 'w') {
        output.write(el.text() + '\t' + el.attribute('ana') + '\n')
      }
      else if (el.localName() === 'c') {
        output.write(el.text() + '\tPUN\n')
      }
    })
  }
  catch (e) {
    console.error(e.stack)
  }
}
