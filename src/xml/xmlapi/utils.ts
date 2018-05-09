export const NS_XML = 'http://www.w3.org/XML/1998/namespace'

////////////////////////////////////////////////////////////////////////////////
export function wrappedOrNull<T>(ctor: { new (val): T; }, val): T {
  return val ? new ctor(val) : null
}

////////////////////////////////////////////////////////////////////////////////
/** class decorator, see http://www.typescriptlang.org/docs/handbook/mixins.html */
export function mixin(...baseCtors: Array<any>) {
  return derivedCtor => {
    for (let baseCtor of baseCtors) {
      for (let name of Object.getOwnPropertyNames(baseCtor.prototype)) {
        if (name !== 'constructor' && !derivedCtor.prototype.hasOwnProperty(name)) {
          Object.defineProperty(
            derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name))
        }
      }
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function countGenerated<T>(generator: Iterator<T>) {
  let i = 0
  while (!generator.next().done) {
    ++i
  }

  return i
}

////////////////////////////////////////////////////////////////////////////////
export function ithGenerated<T>(generator: Iterator<T>, index: number) {
  let cur = generator.next()
  while (index-- && !cur.done) {
    cur = generator.next()
  }

  return cur.value
}

////////////////////////////////////////////////////////////////////////////////
export function isOddball(value) {
  return value === null || value === undefined
}

////////////////////////////////////////////////////////////////////////////////
// edited from https://github.com/vkiryukhin/pretty-data
export function prettify(xmlstr: string, gentle = false) {
  let shift = ['\n'] // array of shifts
  // initialize array with shifts //
  for (let i = 0; i < 100; ++i) {  // todo: dehardcode
    shift.push(shift[i] + '  ')
  }

  let ar = xmlstr
    .replace(/>\s+</g, '> <')
    .replace(/</g, '~::~<')
    .replace(/xmlns\:/g, '~::~xmlns:')
    .replace(/xmlns\=/g, '~::~xmlns=')
    .split('~::~')

  let inComment = false
  let deep = 0
  let str = ''
  for (let i = 0; i < ar.length; i++) {
    // start comment or <![CDATA[...]]> or <!DOCTYPE //
    if (ar[i].search(/<!/) > -1) {
      str += shift[deep] + ar[i]
      inComment = true
      // end comment  or <![CDATA[...]]> //
      if (ar[i].search(/-->/) > -1 || ar[i].search(/\]>/) > -1 || ar[i].search(/!DOCTYPE/) > -1) {
        inComment = false
      }
    } else
      // end comment  or <![CDATA[...]]> //
      if (ar[i].search(/-->/) > -1 || ar[i].search(/\]>/) > -1) {
        str += ar[i]
        inComment = false
      } else
        // <elm></elm> //
        if (/^<\w/.exec(ar[i - 1]) && /^<\/\w/.exec(ar[i]) && /^<[\w:\-\.\,]+/.exec(ar[i - 1])[0] === /^<\/[\w:\-\.\,]+/.exec(ar[i])[0].replace('/', '')) {
          str += ar[i]
          if (!inComment) {
            --deep
          }
        } else
          // <elm> //
          if (ar[i].search(/<\w/) > -1 && ar[i].search(/<\//) === -1 && ar[i].search(/\/>/) === -1) {
            if (inComment) {
              str += ar[i]
            } else if (gentle && !/\s$/.test(ar[i - 1])) {
              str += ar[i]
              ++deep
            } else {
              str += shift[deep++] + ar[i]
            }
          } else
            // <elm>...</elm> //
            if (ar[i].search(/<\w/) > -1 && ar[i].search(/<\//) > -1) {
              str = !inComment ? str += shift[deep] + ar[i] : str += ar[i]
            } else
              // </elm> //
              if (ar[i].search(/<\//) > -1) {
                str = !inComment ? str += shift[--deep] + ar[i] : str += ar[i]
              } else
                // <elm/> //
                if (ar[i].search(/\/>/) > -1) {
                  str = !inComment ? str += shift[deep] + ar[i] : str += ar[i]
                } else
                  // <? xml ... ?> //
                  if (ar[i].search(/<\?/) > -1) {
                    str += shift[deep] + ar[i]
                  } else
                    // xmlns //
                    if (ar[i].search(/xmlns\:/) > -1 || ar[i].search(/xmlns\=/) > -1) {
                      str += shift[deep] + ar[i]
                    }
                    else {
                      str += ar[i]
                    }
  }

  if (str[0] === '\n') {
    str = str.slice(1)
  }

  str = str.replace(/\s+\n/g, '\n')

  return str
}
