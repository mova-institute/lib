import {encloseInRoot, encloseInRootNs, removeXmlns} from '../xml/utils';

export const MAX_CONCUR_ANNOT = 3;

////////////////////////////////////////////////////////////////////////////////
export function mergeXmlFragments(fragments: Array<string>) {
  fragments = fragments.map(x => encloseInRoot(x, 'mi:fragment'));
  return encloseInRootNs(fragments.join(''), 'mi:segment');
}

////////////////////////////////////////////////////////////////////////////////
export function nextTaskType(type: string) {
  if (type === 'annotate') {
    return 'review';
  }
  
  throw new Error('Not implemented: nextTaskType');
}