import {encloseInRoot} from '../xml/utils';

export const MAX_CONCUR_ANNOT = 3;

////////////////////////////////////////////////////////////////////////////////
export function mergeXmlFragments(fragments: Array<string>) {
  fragments = fragments.map(x => encloseInRoot(x, 'tei', 'mi:fragment'));
  return encloseInRoot(fragments.join(''), 'tei', 'mi:segment');
}