/* global Bare */
const assert = require('bare-assert')
const { Thread } = Bare

Bare.on('message', msg => console.log('thread received:', msg))

assert(Thread.isMainThread === false)

assert(Thread.self.data.equals(Buffer.from('hello world')))
