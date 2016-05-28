import { Dictionary } from './dictionary';
import { Guide } from './guide';
import { Dawg } from './dawg';



export class CompletionDawg extends Dawg {
  constructor(dictionary: Dictionary, protected guide: Guide) {
    super(dictionary);
  }

  *completionBytes(key: Array<number>) {
    let index = this.dictionary.followBytes(key);
    if (index === null) {
      return;
    }

    yield* completer(this.dictionary, this.guide, index);
  }
}


//------------------------------------------------------------------------------
function* completer(dic: Dictionary, guide: Guide, index: number) {
  let completion = new Array<number>();
  let indexStack = [index];
  while (indexStack.length) {

    // find terminal
    while (!dic.hasValue(index)) {
      let label = guide.child(index);
      index = dic.followByte(label, index);
      if (index === null) {
        return;
      }
      completion.push(label);
      indexStack.push(index);
    }

    yield completion;

    let childLabel = guide.child(index);
    if (childLabel) {
      if ((index = dic.followByte(childLabel, index)) === null) {
        return;
      }
      completion.push(childLabel);
      indexStack.push(index);
    }
    else {
      while (true) {
        // move up to previous
        indexStack.pop();
        if (!indexStack.length) {
          return;
        }
        completion.pop();

        let siblingLabel = guide.sibling(index);
        index = indexStack[indexStack.length - 1];
        if (siblingLabel) {  // todo: that's the '\0' place??
          if ((index = dic.followByte(siblingLabel, index)) === null) {
            return;
          }
          completion.push(siblingLabel);
          indexStack.push(index);
          break;
        }
      }
    }
  }
}
