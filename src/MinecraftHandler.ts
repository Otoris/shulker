import fs from 'fs'
import path from 'path'
import ***REMOVED*** Tail ***REMOVED*** from 'tail'
import express from 'express'

import ***REMOVED*** Config ***REMOVED*** from './Config'

export type LogLine = ***REMOVED***
  username: string
  message: string
***REMOVED*** | null

type Callback = (data: LogLine) => void

class MinecraftHandler ***REMOVED***
  config: Config

  app: express.Application
  tail: Tail

  constructor(config: Config) ***REMOVED***
    this.config = config
  ***REMOVED***

  private static fixMinecraftUsername (username: string) ***REMOVED***
    return username.replace(/(§[A-Z-a-z0-9])/g, '')
  ***REMOVED***

  private parseLogLine (data: string): LogLine ***REMOVED***
    const ignored = new RegExp(this.config.REGEX_IGNORED_CHAT)

    if (ignored.test(data) || data.includes('Rcon connection')) ***REMOVED***
      if (this.config.DEBUG) console.log('[DEBUG] Line ignored')
      return null
    ***REMOVED***

    if (this.config.DEBUG) console.log('[DEBUG] Received ' + data)

    const logLineDataRegex = new RegExp(
      `$***REMOVED***(this.config.REGEX_SERVER_PREFIX || "\\[Server thread/INFO\\]:")***REMOVED*** (.*)`
    )

    // get the part after the log prefix, so all the actual data is here
    const logLineData = data.match(logLineDataRegex)

    if (!logLineDataRegex.test(data) || !logLineData) ***REMOVED***
      if (this.config.DEBUG) ***REMOVED***
        console.log('[DEBUG] Regex could not match the string:')
        console.log('Received: "' + data + '", Regex matches lines that start with: "' + this.config.REGEX_SERVER_PREFIX + '"')
      ***REMOVED***
      return null
    ***REMOVED***

    const logLine = logLineData[2]

    // the username used for server messages
    const serverUsername = `$***REMOVED***this.config.SERVER_NAME***REMOVED*** - Server`

    if (this.config.DEBUG) ***REMOVED***
      console.log('[DEBUG]: Parsing: ', logLine, ' :or: ', logLineData)
    ***REMOVED***

    if (logLine.startsWith('<')) ***REMOVED***
      if (this.config.DEBUG)***REMOVED***
        console.log('[DEBUG]: A player sent a chat message')
      ***REMOVED***

      const re = new RegExp(this.config.REGEX_MATCH_CHAT_MC)
      const matches = logLine.match(re)

      if (!matches) ***REMOVED***
        console.log('[ERROR] Could not parse message: ' + logLine)
        return null
      ***REMOVED***

      const username = MinecraftHandler.fixMinecraftUsername(matches[1])
      const message = matches[2]
      if (this.config.DEBUG) ***REMOVED***
        console.log('[DEBUG] Username: ' + matches[1])
        console.log('[DEBUG] Text: ' + matches[2])
      ***REMOVED***
      return ***REMOVED*** username, message ***REMOVED***
    ***REMOVED*** else if (
      this.config.SHOW_PLAYER_CONN_STAT && (
        logLine.includes('joined the game')
      )
    ) ***REMOVED***
      // handle disconnection etc.
      if (this.config.DEBUG)***REMOVED***
        console.log(`[DEBUG]: A player's connection status changed`)
      ***REMOVED***

      return ***REMOVED*** username: serverUsername, message: logLine ***REMOVED***
    ***REMOVED*** else if (this.config.SHOW_PLAYER_ADVANCEMENT && logLine.includes('made the advancement')) ***REMOVED***
      // handle advancements
      if (this.config.DEBUG)***REMOVED***
        console.log('[DEBUG] A player has made an advancement')
      ***REMOVED***
      return ***REMOVED*** username: `$***REMOVED***this.config.SERVER_NAME***REMOVED*** - Server`, message: logLine ***REMOVED***
    ***REMOVED*** else if (this.config.SHOW_PLAYER_ME && logLine.startsWith('* ')) ***REMOVED***
      // /me commands have the bolded name and the action they did
      const usernameMatch = data.match(/: \* ([a-zA-Z0-9_]***REMOVED***1,16***REMOVED***) (.*)/)
      if (usernameMatch) ***REMOVED***
        const username = usernameMatch[1]
        const rest = usernameMatch[2]
        return ***REMOVED*** username: serverUsername, message: `**$***REMOVED***username***REMOVED***** $***REMOVED***rest***REMOVED***` ***REMOVED***
      ***REMOVED***
    ***REMOVED*** else if (this.config.SHOW_PLAYER_DEATH) ***REMOVED***
      for (let word of this.config.DEATH_KEY_WORDS)***REMOVED***
        if (data.includes(word))***REMOVED***
          if (this.config.DEBUG) ***REMOVED***
            console.log(
              `[DEBUG] A player died. Matched key word "$***REMOVED***word***REMOVED***"`
            )
          ***REMOVED***
          return ***REMOVED*** username: serverUsername, message: logLine ***REMOVED***
        ***REMOVED***
      ***REMOVED***
    ***REMOVED***

    return null
  ***REMOVED***

  private initWebServer (callback: Callback) ***REMOVED***
    // init the webserver
    this.app = express()

    this.app.use((request, response, next) => ***REMOVED***
      request.rawBody = ''
      request.setEncoding('utf8')

      request.on('data', (chunk: string) => ***REMOVED***
        request.rawBody += chunk
      ***REMOVED***)

      request.on('end', function () ***REMOVED***
        next()
      ***REMOVED***)
    ***REMOVED***)

    this.app.post(this.config.WEBHOOK, (req, res) => ***REMOVED***
      if (req.rawBody) ***REMOVED***
        const logLine = this.parseLogLine(req.rawBody)
        callback(logLine)
      ***REMOVED***
      res.json(***REMOVED*** received: true ***REMOVED***)
    ***REMOVED***)

    const port: number = Number(process.env.PORT) || this.config.PORT

    this.app.listen(port, () => ***REMOVED***
      console.log('[INFO] Bot listening on *:' + port)

      if (!this.config.IS_LOCAL_FILE && this.config.SHOW_INIT_MESSAGE) ***REMOVED***
        // in case someone inputs the actual path and url in the config here...
        let mcPath: string = this.config.PATH_TO_MINECRAFT_SERVER_INSTALL || 'PATH_TO_MINECRAFT_SERVER_INSTALL'
        const url: string = this.config.YOUR_URL || 'YOUR_URL'

        const defaultPath = mcPath === 'PATH_TO_MINECRAFT_SERVER_INSTALL'
        const defaultUrl = url === 'YOUR_URL'

        console.log('[INFO] Please enter the following command on your server running the Minecraft server:')
        if (defaultPath) ***REMOVED***
          console.log('       Replace "PATH_TO_MINECRAFT_SERVER_INSTALL" with the path to your Minecraft server install' + (defaultUrl ? ' and "YOUR_URL" with the URL/IP of the server running Shulker.' : ''))
        ***REMOVED*** else ***REMOVED***
          if (defaultUrl) console.log('       Replace "YOUR_URL" with the URL/IP of the server running Shulker')
        ***REMOVED***

        mcPath = (defaultPath ? '/' : '') + path.join(mcPath, '/logs/latest.log')

        let grepMatch = ': <'
        if (this.config.SHOW_PLAYER_DEATH || this.config.SHOW_PLAYER_ME || this.config.SHOW_PLAYER_ADVANCEMENT || this.config.SHOW_PLAYER_CONN_STAT) ***REMOVED***
          grepMatch = this.config.REGEX_SERVER_PREFIX
        ***REMOVED***
        console.log(`  \`tail -F $***REMOVED***mcPath***REMOVED*** | grep --line-buffered "$***REMOVED***grepMatch***REMOVED***" | while read x ; do echo -ne $x | curl -X POST -d @- http://$***REMOVED***url***REMOVED***:$***REMOVED***port***REMOVED***$***REMOVED***this.config.WEBHOOK***REMOVED*** ; done\``)
        if (grepMatch !== ': <') ***REMOVED***
          console.log('       Please note that the above command can send a lot of requests to the server. Disable the non-text messages (such as "SHOW_PLAYER_CONN_STAT") to reduce this if necessary.')
        ***REMOVED***
      ***REMOVED***
    ***REMOVED***)
  ***REMOVED***

  private initTail (callback: Callback) ***REMOVED***
    if (fs.existsSync(this.config.LOCAL_FILE_PATH)) ***REMOVED***
      console.log(`[INFO] Using configuration for local log file at "$***REMOVED***this.config.LOCAL_FILE_PATH***REMOVED***"`)
      this.tail = new Tail(this.config.LOCAL_FILE_PATH, ***REMOVED***useWatchFile: true***REMOVED***)
    ***REMOVED*** else ***REMOVED***
      throw new Error(`[ERROR] Local log file not found at "$***REMOVED***this.config.LOCAL_FILE_PATH***REMOVED***"`)
    ***REMOVED***
    this.tail.on('line', (data: string) => ***REMOVED***
      // Parse the line to see if we care about it
      let logLine = this.parseLogLine(data)
      if (data) ***REMOVED***
        callback(logLine)
      ***REMOVED***
    ***REMOVED***)
    this.tail.on('error', (error: any) => ***REMOVED***
      console.log('[ERROR] Error tailing log file: ' + error)
    ***REMOVED***)
  ***REMOVED***

  public init (callback: Callback) ***REMOVED***
    if (this.config.IS_LOCAL_FILE) ***REMOVED***
      this.initTail(callback)
    ***REMOVED*** else ***REMOVED***
      this.initWebServer(callback)
    ***REMOVED***
  ***REMOVED***
***REMOVED***

export default MinecraftHandler
