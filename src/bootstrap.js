{
  // TODO: can we easily extend Uint8Arrays like in node?

  global.Buffer = {}

  global.Buffer.allocUnsafe = function (n) {
    return new Uint8Array(n)
  }

  global.Buffer.alloc = function (n) {
    return new Uint8Array(n)
  }

  global.Buffer.concat = function (arr, len) {
    if (typeof len !== 'number') {
      len = 0
      for (let i = 0; i < arr.length; i++) len += arr[i].byteLength
    }
    const result = global.Buffer.allocUnsafe(len)

    len = 0
    for (let i = 0; i < arr.length; i++) {
      result.set(arr[i], len)
      len += arr[i].byteLength
    }

    return result
  }
}

{
  const times = new Map()

  global.console = {
    log (...msg) {
      log(process._stdout, ...msg)
    },
    error (...msg) {
      log(process._stderr, ...msg)
    },
    time (lbl = 'default') {
      times.set(lbl, process.hrtime())
    },
    timeEnd (lbl = 'default') {
      const t = times.get(lbl)
      if (!t) throw new Error('No matching label for ' + lbl)
      const d = process.hrtime(t)
      const ms = d[0] * 1e3 + d[1] / 1e6
      times.delete(lbl)
      if (ms > 1000) console.log(lbl + ': ' + (ms / 1000).toFixed(3) + 's')
      else console.log(lbl + ': ' + ms.toFixed(3) + 'ms')
    }
  }

  function log (output, ...msg) {
    let s = ''
    for (const m of msg) s += m + ' '
    output(s.trim() + '\n')
  }
}

{
  const resolved = Promise.resolve()
  global.queueMicrotask = (fn) => {
    resolved.then(fn)
  }
}

class Module {
  constructor (filename, dirname) {
    this.filename = filename
    this.dirname = dirname
    this.exports = {}
  }

  _loadJSON () {
    this.exports = JSON.parse(process._readSourceSync(this.filename))
    return this.exports
  }

  _loadJS () {
    const dirname = this.dirname

    require.cache = Module.cache
    require.resolve = resolve

    Module.runScript(this, process._readSourceSync(this.filename), require)

    return this.exports

    function resolve (req) {
      return Module.resolve(req, dirname)
    }

    function require (req) {
      if (req === 'module') return Module
      const filename = resolve(req)
      return Module.load(filename)
    }
  }

  static cache = Object.create(null)

  static load (filename) {
    if (Module.cache[filename]) return Module.cache[filename].exports

    const mod = new Module(filename, Module.resolvePath(filename, '..'))

    Module.cache[filename] = mod

    return filename.endsWith('.json') ? mod._loadJSON() : mod._loadJS()
  }

  static resolvePath = (function () { // inlined unix-path-resolve
    return resolve

    function parse (addr) {
      const names = addr.split(/[/\\]/)

      const r = {
        isAbsolute: false,
        names
      }

      // don't think this ever happens, but whatevs
      if (names.length === 0) return r

      if (names.length > 1 && names[0].endsWith(':')) {
        r.isAbsolute = true

        if (names[0].length === 2) { // windows
          r.names = names.slice(1)
          return r
        }

        if (names[0] === 'file:') {
          r.names = names.slice(1)
          return r
        }

        r.names = names.slice(3)
        return r
      }

      r.isAbsolute = addr.startsWith('/') || addr.startsWith('\\')

      return r
    }

    function resolve (a, b = '') {
      const ap = parse(a)
      const bp = parse(b)

      if (bp.isAbsolute) {
        return resolveNames([], bp.names)
      }

      if (!ap.isAbsolute) {
        throw new Error('One of the two paths must be absolute')
      }

      return resolveNames(ap.names, bp.names)
    }

    function toString (p, names) {
      for (let i = 0; i < names.length; i++) {
        if (names[i] === '') continue
        if (names[i] === '.') continue
        if (names[i] === '..') {
          if (p.length === 1) throw new Error('Path cannot be resolved, too many \'..\'')
          p = p.slice(0, p.lastIndexOf('/')) || '/'
          continue
        }
        p += (p.length === 1 ? names[i] : '/' + names[i])
      }

      return p
    }

    function resolveNames (a, b) {
      return toString(toString('/', a), b)
    }
  })()

  static runScript (module, source, require) {
    new Function('__dirname', '__filename', 'module', 'exports', 'require', source + '\n//# sourceURL=' + module.filename)( // eslint-disable-line
      module.dirname,
      module.filename,
      module,
      module.exports,
      require
    )
  }

  static resolve (req, dirname) {
    if (req.length === 0) throw new Error('Could not resolve ' + req + ' from ' + dirname)

    let path = null

    if (req[0] !== '.' && req[0] !== '/') {
      const target = 'node_modules/' + req

      while (true) {
        const nm = Module.resolvePath(dirname, target)
        const type = process._existsSync(nm)

        if (type === 0) {
          const parent = Module.resolvePath(dirname, '..')
          if (parent === nm) throw new Error('Could not resolve ' + req + ' from ' + dirname)
          dirname = parent
          continue
        }

        dirname = nm
        req = '.'
        break
      }
    }

    path = Module.resolvePath(dirname, req)

    if (/\.(js|mjs|cjs|json)$/i.test(req) && process._existsSync(path) === 1) {
      return path
    }

    if (process._existsSync(path + '.js') === 1) {
      return path + '.js'
    }

    if (process._existsSync(path + '.cjs') === 1) {
      return path + '.cjs'
    }

    if (process._existsSync(path + '.mjs') === 1) {
      return path + '.mjs'
    }

    if (process._existsSync(path + '.json') === 1) {
      return path + '.json'
    }

    const pkg = Module.resolvePath(path, 'package.json')

    if (process._existsSync(pkg) === 1) {
      const json = Module.load(pkg)
      path = Module.resolvePath(path, json.main || 'index.js')

      if (process._existsSync(path) !== 1) {
        throw new Error('Could not resolve ' + req + ' from ' + dirname)
      }

      return path
    }

    path = Module.resolvePath(path, 'index.js')
    if (process._existsSync(path) === 1) {
      return path
    }

    throw new Error('Could not resolve ' + req + ' from ' + dirname)
  }
}

{
  const EMPTY = new Uint32Array(2)

  class Event {
    constructor () {
      this.list = []
      this.emitting = false
      this.removing = null
    }

    add (fn, once) {
      this.list.push([fn, once])
    }

    remove (fn) {
      if (this.emitting === true) {
        if (this.removing === null) this.removing = []
        this.removing.push(fn)
        return
      }

      for (let i = 0; i < this.list.length; i++) {
        const l = this.list[i]

        if (l[0] === fn) {
          this.list.splice(i, 1)
          return
        }
      }
    }

    emit (...args) {
      this.emitting = true
      const listeners = this.list.length > 0

      try {
        for (let i = 0; i < this.list.length; i++) {
          const l = this.list[i]

          l[0].call(this, ...args)
          if (l[1] === true) this.list.splice(i--, 1)
        }
      } finally {
        this.emitting = false

        if (this.removing !== null) {
          const fns = this.removing
          this.removing = null
          for (const fn of fns) this.remove(fn)
        }
      }

      return listeners
    }
  }

  const events = {
    uncaughtException: new Event()
  }

  process._onfatalexception = function onfatalexception (err) {
    if (events.uncaughtException.emit(err)) return
    console.error('Unhandled exception!')
    console.error(err.stack)
    process.exit(1)
  }

  process.on = process.addListener = function on (name, fn) {
    const e = events[name]
    if (e) e.add(fn, false)
    return this
  }

  process.once = function once (name, fn) {
    const e = events[name]
    if (e) e.add(fn, true)
    return this
  }

  process.off = process.removeListener = function (name, fn) {
    const e = events[name]
    if (e) e.remove(fn)
    return this
  }

  process.addon = function addon (dirname, opts) {
    if (typeof dirname !== 'string') throw new TypeError('dirname must be a string')
    const resolve = (opts && opts.resolve) !== false
    return process._loadAddon(dirname, resolve ? 1 : 0)
  }

  process.addon.resolve = function resolve (dirname) {
    if (typeof dirname !== 'string') throw new TypeError('dirname must be a string')
    return process._resolveAddon(dirname)
  }

  process.hrtime = function hrtime (prev = EMPTY) {
    const result = new Uint32Array(2)
    process._hrtime(result, prev)
    return result
  }

  process.exit = function exit (code) {
    process._exit(typeof code === 'number' ? code : 0)
  }
}

process.main = Module.load(process._entryPoint, Module.resolvePath(process._entryPoint, '..'))
