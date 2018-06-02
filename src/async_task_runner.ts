import { mu } from './mu'
import { numThreads } from './os'



////////////////////////////////////////////////////////////////////////////////
export type TaskFunc<Result> = () => Promise<Result>

////////////////////////////////////////////////////////////////////////////////
export class AsyncTaskRunner<Result = void> {
  private concurrency = numThreads()
  private tasksRunning = new Set<Promise<Result>>()
  private slotAvail: Promise<Result>

  post(task: TaskFunc<Result>): [Promise<any>, Promise<Result>] {
    if (this.tasksRunning.size < this.concurrency) {
      let result = task()
      this.tasksRunning.add(result)
      return [Promise.resolve(), result]
    } else {
      let posted = this.slotAvail
      this.slotAvail = (async () => {
        await this.slotAvail
        let { promise } = await Promise.race(this.wrappedTasks())
        this.tasksRunning.delete(promise)
        let result = task()
        this.tasksRunning.add(result)
        return result
      })()
      return [posted, this.slotAvail]
    }
  }

  setConcurrency(value: number) {
    if (value < 1) {
      throw new Error()
    }
    this.concurrency = value
    return this
  }

  private wrappedTasks() {
    return mu(this.tasksRunning).map(promise => (async () => {
      let result = await promise
      return { promise, result }
    })())
  }
}
