// @flow

import type {
  IDBDatabase,
  IDBTransaction,
  IDBOpenDBRequest,
} from './indexeddb.flow'

const DB_NAME = 'JWALLET-WEB'
const DB_STORE_NAME = 'JWALLET-WEB-STORE'
const DB_VERSION = 1

// Transaction Modes
const READ_ONLY = 'readonly'
const READ_WRITE = 'readwrite'

/* eslint-disable-next-line fp/no-let */
let connectedDB: ?IDBDatabase = null

function getConnection(): Promise<IDBDatabase> {
  return new Promise(((resolve, reject) => {
    if (connectedDB) {
      resolve(connectedDB)

      return
    }

    const openRequest: IDBOpenDBRequest = idb.open(DB_NAME, DB_VERSION)

    openRequest.onerror = (e) => {
      e.preventDefault()
      reject(openRequest.error)
    }

    openRequest.onsuccess = () => {
      resolve(openRequest.result)
      /* eslint-disable-next-line fp/no-mutation */
      connectedDB = openRequest.result
    }
  }))
}

function createTransaction(db, mode, retries = 1): Promise<IDBTransaction> {
  return Promise
    .resolve()
    .then(() => db.transaction(DB_STORE_NAME, mode))
    .catch((err) => {
      const isRetryAvailable = (retries > 0)
      const isNotFound = (err.name === 'NotFoundError')
      const isInvalidState = (err.name === 'InvalidStateError')

      if (isRetryAvailable && (!db || isInvalidState || isNotFound)) {
        return getConnection().then(newDb => createTransaction(newDb, mode, retries - 1))
      }

      throw err
    })
}

function getItem(key: string): Promise<?string> {
  return getConnection()
    .then(db => createTransaction(db, READ_ONLY))
    .then(tx => new Promise((resolve, reject) => {
      const store = tx.objectStore(DB_STORE_NAME)
      const getRequest = store.get(key)

      getRequest.onsuccess = () => {
        const value: ?string = getRequest.result
        resolve((value === undefined) ? null : value)
      }

      getRequest.onerror = () => {
        reject(getRequest.error)
      }
    }))
}

function setItem(key: string, value: string): Promise<?string> {
  return getConnection()
    .then(db => createTransaction(db, READ_WRITE))
    .then(tx => new Promise((resolve, reject) => {
      const store = tx.objectStore(DB_STORE_NAME)
      const putRequest = store.put((value === null) ? undefined : value, key)

      /* eslint-disable no-param-reassign */
      tx.oncomplete = () => {
        resolve((value === undefined) ? null : value)
      }

      tx.onabort = () => {
        const { error, transaction } = putRequest
        reject(error || transaction.error)
      }

      tx.onerror = tx.onabort
      /* eslint-enable no-param-reassign */
    }))
}

function removeItem(key: string): Promise<void> {
  return getConnection()
    .then(db => createTransaction(db, READ_WRITE))
    .then(tx => new Promise((resolve, reject) => {
      const store = tx.objectStore(DB_STORE_NAME)
      const deleteRequest = store.delete(key)

      /* eslint-disable no-param-reassign */
      tx.oncomplete = () => {
        resolve()
      }

      tx.onerror = () => {
        reject(deleteRequest.error)
      }

      tx.onabort = () => {
        const { error, transaction } = deleteRequest
        reject(error || transaction.error)
      }
      /* eslint-enable no-param-reassign */
    }))
}

function clear(): Promise<void> {
  return getConnection()
    .then(db => createTransaction(db, READ_WRITE))
    .then(tx => new Promise((resolve, reject) => {
      const store = tx.objectStore(DB_STORE_NAME)
      const clearRequest = store.clear()

      /* eslint-disable no-param-reassign */
      tx.oncomplete = () => {
        resolve()
      }

      tx.onabort = () => {
        const { error, transaction } = clearRequest
        reject(error || transaction.error)
      }

      tx.onerror = tx.onabort
      /* eslint-enable no-param-reassign */
    }))
}

function length(): Promise<number> {
  return getConnection()
    .then(db => createTransaction(db, READ_ONLY))
    .then(tx => new Promise((resolve, reject) => {
      const store = tx.objectStore(DB_STORE_NAME)
      const countRequest = store.count()

      countRequest.onsuccess = () => {
        resolve(countRequest.result)
      }

      countRequest.onerror = () => {
        reject(countRequest.error)
      }
    }))
}

function dropInstance(): Promise<void> {
  return getConnection()
    .then(db => new Promise((resolve, reject) => {
      db.close()

      const deleteDatabaseRequest = idb.deleteDatabase(DB_NAME)

      deleteDatabaseRequest.onsuccess = () => {
        resolve()
      }

      deleteDatabaseRequest.onerror = (err) => {
        reject(err)
      }

      deleteDatabaseRequest.onblocked = deleteDatabaseRequest.onerror
    }))
}

const asyncStorage = {
  clear,
  length,
  getItem,
  setItem,
  removeItem,
  dropInstance,
}

export default asyncStorage
