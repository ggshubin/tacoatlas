const stores = {}

class MMKV {
  constructor(config) {
    this.id = config?.id ?? 'default'
    if (!stores[this.id]) stores[this.id] = {}
    this.store = stores[this.id]
  }

  getString(key) {
    return this.store[key]
  }

  set(key, value) {
    this.store[key] = value
  }

  delete(key) {
    delete this.store[key]
  }

  contains(key) {
    return key in this.store
  }

  clearAll() {
    this.store = {}
    stores[this.id] = {}
  }
}

module.exports = { MMKV }
