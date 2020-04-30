import * as redis from 'redis'

import { promisify } from 'util'


////////////////////////////////////////////////////////////////////////////////
export class RedisClientPromisified {
  static create(options?: redis.ClientOpts) {
    return new RedisClientPromisified(redis.createClient(options))
  }

  sadd = promisify(this.client.sadd).bind(this.client)
  quit = promisify(this.client.quit).bind(this.client)

  constructor(private client: redis.RedisClient) {
  }
}
