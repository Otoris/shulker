// Credits to M4GNV5 for this library

import net from 'net'

class Rcon ***REMOVED***
  socket: net.Socket
  timeout: number
  nextId: number

  connected: boolean
  authed: boolean
  debug: boolean

  ip: string
  port: number

  packages: ***REMOVED*** [key: number]: (type: number, response: string) => void ***REMOVED***

  constructor (ip: string, port: number, debug: boolean) ***REMOVED***
    this.ip = ip
    this.port = port
    this.debug = debug

    this.timeout = 5000
    this.nextId = 0
    this.connected = false
    this.authed = false
    this.packages = []

    this.socket = net.connect(port, ip, () => ***REMOVED***
      this.connected = true
      console.log('[INFO] Authenticated with ' + ip + ':' + port)
    ***REMOVED***)

    this.socket.on('data', (data: Buffer) => ***REMOVED***
      const id = data.readInt32LE(4)
      const type = data.readInt32LE(8)
      const response = data.toString('ascii', 12, data.length - 2)

      if (this.packages[id]) ***REMOVED***
        this.packages[id](type, response)
      ***REMOVED*** else ***REMOVED***
        console.log('Unexpected rcon response', id, type, response)
      ***REMOVED***
    ***REMOVED***).on('end', () => ***REMOVED***
      if (debug) ***REMOVED***
        console.log('[DEBUG] Rcon closed!')
      ***REMOVED***
    ***REMOVED***)
  ***REMOVED***

  public close () ***REMOVED***
    this.connected = false
    this.socket.end()
  ***REMOVED***

  public async auth (password: string): Promise<void> ***REMOVED***
    if (this.authed) ***REMOVED*** throw new Error('Already authed') ***REMOVED***

    if (this.connected)***REMOVED***
      try ***REMOVED***
        await this.sendPackage(3, password)
      ***REMOVED*** catch (e) ***REMOVED***
        console.log('[ERROR] Could not send password to Rcon server!')
        if (this.debug) console.error(e)
      ***REMOVED***
    ***REMOVED*** else ***REMOVED***
      return new Promise((resolve, reject) => ***REMOVED***
        this.socket.on('connect', async () => ***REMOVED***
          try ***REMOVED***
            await this.sendPackage(3, password)
            resolve()
          ***REMOVED*** catch (e) ***REMOVED***
            console.log('[ERROR] Could not send password to Rcon server!')
            if (this.debug) console.error(e)
            reject(e)
          ***REMOVED***
        ***REMOVED***)
      ***REMOVED***)
    ***REMOVED***
  ***REMOVED***

  public command (cmd: string): Promise<string> ***REMOVED***
    return this.sendPackage(2, cmd)
  ***REMOVED***

  public sendPackage (type: number, payload: string): Promise<string> ***REMOVED***
    const id = this.nextId
    this.nextId++

    if (!this.connected) ***REMOVED*** throw new Error('Cannot send package while not connected') ***REMOVED***

    const length = 14 + payload.length
    const buff = Buffer.alloc(length)
    buff.writeInt32LE(length - 4, 0)
    buff.writeInt32LE(id, 4)
    buff.writeInt32LE(type, 8)

    buff.write(payload, 12)
    buff.writeInt8(0, length - 2)
    buff.writeInt8(0, length - 1)

    this.socket.write(buff)

    return new Promise((resolve, reject) => ***REMOVED***
      const timeout = setTimeout(() => ***REMOVED***
        delete this.packages[id]
        return reject('Server sent no request in ' + this.timeout / 1000 + ' seconds')
      ***REMOVED***, this.timeout)

      this.packages[id] = (type: number, response: string) => ***REMOVED***
        clearTimeout(timeout)
        const err = type >= 0 ? false : 'Server sent package code ' + type
        if (this.debug) ***REMOVED***
          console.log('[DEBUG] Received response: ' + response)
        ***REMOVED***
        if (err) return reject(err)
        return resolve(response)
      ***REMOVED***
    ***REMOVED***)
  ***REMOVED***
***REMOVED***

export default Rcon
