// @flow

import type { IDBFactory } from '../drivers/indexeddb.flow'

function getIDB(): IDBFactory {
  try {
    if (typeof window.indexedDB !== 'undefined') {
      return window.indexedDB
    }

    if (typeof window.webkitIndexedDB !== 'undefined') {
      return window.webkitIndexedDB
    }

    if (typeof window.mozIndexedDB !== 'undefined') {
      return window.mozIndexedDB
    }

    if (typeof window.OIndexedDB !== 'undefined') {
      return window.OIndexedDB
    }

    if (typeof window.msIndexedDB !== 'undefined') {
      return window.msIndexedDB
    }
  } catch (e) {
    throw e
  }

  throw new Error('indexedDB is not available')
}

export default getIDB()
