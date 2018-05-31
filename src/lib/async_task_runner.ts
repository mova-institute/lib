import { mu } from '../mu'
import { cpus } from 'os'



////////////////////////////////////////////////////////////////////////////////
export type TaskFunc<Result> = () => Promise<Result>

////////////////////////////////////////////////////////////////////////////////
// export class AsyncTaskRunner<Result = void> {
//   private concurrency = cpus().length
//   private tasks = new Set<Promise<Result>>()
//   private race: Promise<WrappedPromise<Result>>

//   async start(task: TaskFunc<Result>) {
//     console.error(this.tasks.size)
//     while (this.tasks.size === this.concurrency) {
//       let { promise } = await this.race
//       this.tasks.delete(promise)
//     }
//     this.push(task())
//   }

//   setConcurrency(value: number) {
//     this.concurrency = value || cpus().length
//     return this
//   }

//   private push(task: Promise<Result>) {
//     this.tasks.add(task)
//     let newRace = mu(this.tasks).map(promise => (async () => {
//       let result = await promise
//       return { promise, result }
//     })())
//     this.race = Promise.race(newRace)
//   }
// }

////////////////////////////////////////////////////////////////////////////////
export class AsyncTaskRunner<Result = void> {
  private concurrency = cpus().length
  private tasksRunning = new Set<Promise<Result>>()
  private slotAvail: Promise<void>

  async start(task: TaskFunc<Result>) {
    if (this.tasksRunning.size < this.concurrency) {
      this.tasksRunning.add(task())
    } else {
      return this.slotAvail = (async () => {
        await this.slotAvail
        let { promise } = await Promise.race(this.wrappedTasks())
        this.tasksRunning.delete(promise)
        this.tasksRunning.add(task())
      })()
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
