
////////////////////////////////////////////////////////////////////////////////
export class VesumTypeahead {
  private _allTags = new Set<string>();
  
  constructor(tags: string[]) {
    tags.map(x => x.split(':'))
  }
}
