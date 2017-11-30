import { UnsignedIntCycle } from './unsigned_int_cycle'
import { cpus } from 'os'



//------------------------------------------------------------------------------
interface WrappedResult<T> {
  result: T
  id: number
}

////////////////////////////////////////////////////////////////////////////////
export type TaskFunc<Result> = () => Promise<Result>

////////////////////////////////////////////////////////////////////////////////
export class AsyncTaskRunner<Result> {
  private idGenerator = new UnsignedIntCycle()
  private tasks = new Map<number, Promise<WrappedResult<Result>>>()
  private concurrency = cpus().length
  private race: Promise<WrappedResult<Result>>

  async startRunning(taskFunc: TaskFunc<Result>) {
    let ret: Result

    if (this.tasks.size === this.concurrency) {
      let wrappedResult = await this.race
      this.tasks.delete(wrappedResult.id)
      ret = wrappedResult.result
    }
    this.push(taskFunc)

    return ret
  }

  setConcurrency(value: number) {
    this.concurrency = value || cpus().length
    return this
  }

  private push(taskFunc: TaskFunc<Result>) {
    let id = this.idGenerator.next()
    let wrapper = async () => ({
      result: await taskFunc(),
      id,
    })
    this.tasks.set(id, wrapper())
    this.rerace()
  }

  private rerace() {
    this.race = Promise.race(this.tasks.values())
  }
}
