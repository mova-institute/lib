import { mu } from './mu'
import { numThreads } from './os'

export type TaskFunc<Result> = () => Promise<Result>

export class AsyncTaskRunner<Result = void> {
  private concurrency = numThreads()
  private tasksRunning = new Set<Promise<Result>>()
  private slotAvail: Promise<Result>
  private numQueued = 0

  post(task: TaskFunc<Result>) {
    return this.postAndDone(task)[0]
  }

  postAndDone(task: TaskFunc<Result>): [Promise<any>, Promise<Result>] {
    if (this.tasksRunning.size < this.concurrency) {
      let result = task()
      this.tasksRunning.add(result)
      result.then(() => this.tasksRunning.delete(result))
      return [Promise.resolve(), result]
    }
    ++this.numQueued
    let posted = this.slotAvail
    this.slotAvail = (async () => {
      await this.slotAvail
      let { promise } = await Promise.race(this.wrappedTasks())
      this.tasksRunning.delete(promise)
      let result = task()
      this.tasksRunning.add(result)
      --this.numQueued
      return result
    })()
    return [posted, this.slotAvail]
  }

  setConcurrency(value: number) {
    if (value < 1) {
      throw new Error()
    }
    this.concurrency = value
    return this
  }

  getNumRunning() {
    return this.tasksRunning.size
  }

  getNumQueued() {
    return this.numQueued
  }

  getSaldo() {
    return this.concurrency - this.getNumRunning() - this.getNumQueued()
  }

  hasFreeSlots() {
    return this.getSaldo() > 0
  }

  private wrappedTasks() {
    return mu(this.tasksRunning).map((promise) =>
      (async () => {
        let result = await promise
        return { promise, result }
      })(),
    )
  }
}
