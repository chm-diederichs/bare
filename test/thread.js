/* global Bare */
const assert = require('bare-assert')
const path = require('bare-path')
const { Thread } = Bare

assert(Thread.isMainThread === true)

const entry = path.join(__dirname, 'fixtures/thread.js')

const detached = new Thread(entry, { data: Buffer.from('hello world') })
detached.on('exit', () => console.log('thread has exited'))

detached.postMessage(Buffer.from('hello'))
detached.postMessage(Buffer.from('hello1'))
detached.postMessage(Buffer.from('hello2'))

setTimeout(() => {
  const thread = new Thread(entry, { data: Buffer.from('hello world') })
  thread.on('exit', () => console.log('thread has exited'))

  thread.join()
  console.log('all done')
}, 200) // allow time for detached to exit
