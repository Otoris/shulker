import DiscordClient from './Discord'
import Handler, ***REMOVED*** LogLine ***REMOVED*** from './MinecraftHandler'

import ***REMOVED*** Config ***REMOVED*** from './Config'

class Shulker ***REMOVED***
  config: Config
  discordClient: DiscordClient
  handler: Handler

  constructor() ***REMOVED***
  ***REMOVED***

  loadConfig () ***REMOVED***
    const configFile = (process.argv.length > 2) ? process.argv[2] : '../config.json'
    console.log('[INFO] Using configuration file:', configFile)
    this.config = require(configFile)
    if (!this.config) ***REMOVED***
      console.log('[ERROR] Could not load config file!')
      return false
    ***REMOVED***

    if (this.config.USE_WEBHOOKS) ***REMOVED***
      console.log('[INFO] Using Discord WebHooks to send messages')
    ***REMOVED*** else ***REMOVED***
      console.log('[INFO] Using the Discord bot to send messages')
    ***REMOVED***

    return true
  ***REMOVED***

  onDiscordReady () ***REMOVED***
    this.handler.init(async (data: LogLine) => ***REMOVED***
      if (data) ***REMOVED***
        const ***REMOVED*** username, message ***REMOVED*** = data
        await this.discordClient.sendMessage(username, message)
      ***REMOVED***
    ***REMOVED***)
  ***REMOVED***

  async init () ***REMOVED***
    const loaded = this.loadConfig()
    if (!loaded) return

    this.discordClient = new DiscordClient(this.config, () => this.onDiscordReady())
    this.handler = new Handler(this.config)

    await this.discordClient.init()
  ***REMOVED***
***REMOVED***

export default Shulker
