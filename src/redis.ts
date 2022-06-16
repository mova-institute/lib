import { RedisClientOptions, RedisClientType, createClient } from 'redis'

import { promisify } from 'util'

// export class RedisClientPromisified {
//   static create(options?: RedisClientOptions) {
//     return new RedisClientPromisified(createClient(options))
//   }

//   sadd = promisify(this.client.sAdd).bind(this.client)
//   quit = promisify(this.client.quit).bind(this.client)

//   constructor(private client: RedisClientType) {
//   }
// }
