/* global bare, Bare */
const { AddonError } = require('./errors')

const Addon = module.exports = exports = class Addon {
  constructor () {
    this._exports = {}
    this._handle = null

    Addon._addons.add(this)
  }

  get exports () {
    return this._exports
  }

  unload () {
    let unloaded = false

    if (this._handle) {
      unloaded = bare.unloadAddon(this._handle)
      this._handle = null
    }

    Addon._addons.delete(this)

    return unloaded
  }

  [Symbol.for('bare.inspect')] () {
    return {
      __proto__: { constructor: Addon },

      exports: this.exports
    }
  }

  static _cache = Object.create(null)
  static _addons = new Set()

  static get cache () {
    return this._cache
  }

  static get host () {
    return `${bare.platform}-${bare.arch}`
  }

  static load (url) {
    const self = Addon

    if (self._cache[url.href]) return self._cache[url.href]

    const addon = self._cache[url.href] = new Addon()

    switch (url.protocol) {
      case 'builtin:':
        addon._handle = bare.loadStaticAddon(url.pathname)
        break

      default:
        addon._handle = bare.loadDynamicAddon(url.pathname)
    }

    addon._exports = bare.initAddon(addon._handle, addon._exports)

    return addon
  }

  static unload (url) {
    const self = Addon

    const addon = self._cache[url.href] || null

    if (addon === null) {
      throw AddonError.ADDON_NOT_FOUND(`Cannot find addon '${url.href}'`)
    }

    const unloaded = addon.unload()

    if (unloaded) delete self._cache[url.href]

    return unloaded
  }

  static resolve (specifier, parentURL, opts = {}) {
    const Module = require('bare-module')
    const resolve = require('bare-addon-resolve')

    const self = Addon

    const {
      name = null,
      version = null,
      referrer = null,
      protocol = referrer ? referrer.protocol : null,
      resolutions = referrer ? referrer.resolutions : null
    } = opts

    const builtins = bare.getStaticAddons()

    for (const resolution of resolve(specifier, parentURL, {
      host: self.host,
      name,
      version,
      resolutions,
      builtins,
      extensions: [
        '.bare',
        '.node'
      ]
    }, readPackage)) {
      switch (resolution.protocol) {
        case 'builtin:': return resolution
        default:
          try {
            return Module.resolve(resolution.href, parentURL, { resolutions })
          } catch {
            continue
          }
      }
    }

    let msg = `Cannot find addon '${specifier}'`

    if (referrer) msg += ` imported from '${referrer._url.href}'`

    throw AddonError.ADDON_NOT_FOUND(msg)

    function readPackage (packageURL) {
      if (protocol.exists(packageURL)) {
        return Module.load(packageURL, { protocol })._exports
      }

      return null
    }
  }
}

Bare
  .prependListener('teardown', () => {
    for (const addon of Addon._addons) {
      addon.unload()
    }
  })
