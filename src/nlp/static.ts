import { r } from '../lang';


// todo: wait for unicode in node's V8
export const WCHAR_UK = r `\-’АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщЬьЮюЯя`;
export const WCHAR_UK_RE = new RegExp(`^[${WCHAR_UK}]+$`);
export const WCHAR_NOT_UK_RE = new RegExp(`^[^${WCHAR_UK}]+$`);
export const WCHAR_OTHER = r`A-Яа-яóé`;
export const WCHAR = r `\w${WCHAR_UK}${WCHAR_OTHER}`;
export const WCHAR_RE = new RegExp(`^[${WCHAR}]+$`);


//(?:(?=\w)(?<!\w)|(?<=\w)(?!\w))
