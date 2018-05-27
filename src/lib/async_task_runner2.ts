import { UnsignedIntCycle } from './unsigned_int_cycle'
import { cpus } from 'os'



//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
interface Wrapper<T> {
  result: T
  id: number
}

////////////////////////////////////////////////////////////////////////////////
export type TaskFunc<Result> = () => Promise<Result>

////////////////////////////////////////////////////////////////////////////////
export class AsyncTaskRunner<Result = void> {
  private concurrency = cpus().length
  private idGenerator = new UnsignedIntCycle()
  private tasks = new Map<number, Promise<Wrapper<Result>>>()
  private schedulePromise = Promise.resolve()

  async startRunning(taskFunc: TaskFunc<Result>) {
    console.error(`TASK Q SIZE: `, this.tasks.size)

    if (this.tasks.size === this.concurrency) {
      // todo: when multiple await
      let { id } = await Promise.race(this.tasks.values())
      this.tasks.delete(id)
    }
    return this.start(taskFunc)
  }

  setConcurrency(value: number) {
    this.concurrency = value || cpus().length
    return this
  }

  private start(taskFunc: TaskFunc<Result>) {
    let id = this.idGenerator.next()
    let resultPromise = taskFunc()
    let wrapper = async () => ({
      result: await resultPromise,
      id,
    })
    this.tasks.set(id, wrapper())
    return resultPromise
  }
}
