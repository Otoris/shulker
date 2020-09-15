import ***REMOVED***Client, Message, Snowflake, TextChannel***REMOVED*** from 'discord.js'

import emojiStrip from 'emoji-strip'
import axios from 'axios'

import ***REMOVED*** Config ***REMOVED*** from './Config'

import Rcon from './Rcon'

class Discord ***REMOVED***
  config: Config
  client: Client

  channel: Snowflake

  constructor (config: Config, onReady?: () => void) ***REMOVED***
    this.config = config

    this.client = new Client()
    if (onReady) this.client.once('ready', () => onReady())
    this.client.on('message', (message: Message) => this.onMessage(message))

    this.channel = config.DISCORD_CHANNEL_ID || ''
  ***REMOVED***

  public async init () ***REMOVED***
    try ***REMOVED***
      await this.client.login(this.config.DISCORD_TOKEN)
      if (this.config.DISCORD_CHANNEL_NAME && !this.config.DISCORD_CHANNEL_ID)
        this.getChannelIdFromName(this.config.DISCORD_CHANNEL_NAME)
    ***REMOVED*** catch (e) ***REMOVED***
      console.log('[ERROR] Could not authenticate with Discord: ' + e)
      if (this.config.DEBUG) console.error(e)
    ***REMOVED***
  ***REMOVED***

  private getChannelIdFromName (name: string) ***REMOVED***
    // remove the # if there is one
    if (name.startsWith('#')) name = name.substring(1, name.length)
    // @ts-ignore
    const channel: TextChannel = this.client.channels.find((c: TextChannel) => c.type === 'text' && c.name === name && !c.deleted)
    if (channel) ***REMOVED***
      this.channel = channel.id
      console.log(`[INFO] Found channel #$***REMOVED***channel.name***REMOVED*** (id: $***REMOVED***channel.id***REMOVED***) in the server "$***REMOVED***channel.guild.name***REMOVED***"`)
    ***REMOVED*** else ***REMOVED***
      console.log(`[INFO] Could not find channel $***REMOVED***name***REMOVED***! Check that the name is correct or use the ID of the channel instead (DISCORD_CHANNEL_ID)!`)
      process.exit(1)
    ***REMOVED***
  ***REMOVED***

  private parseDiscordWebhook (url: string) ***REMOVED***
    const re = /discordapp.com\/api\/webhooks\/([^\/]+)\/([^\/]+)/

    // the is of the webhook
    let id = null
    let token = null

    if (!re.test(url)) ***REMOVED***
      // In case the url changes at some point, I will warn if it still works
      console.log('[WARN] The Webhook URL may not be valid!')
    ***REMOVED*** else ***REMOVED***
      const match = url.match(re)
      if (match) ***REMOVED***
        id = match[1]
        token = match[2]
      ***REMOVED***
    ***REMOVED***

    return ***REMOVED*** id, token ***REMOVED***
  ***REMOVED***

  private async onMessage (message: Message) ***REMOVED***
    // no channel, done
    if (!this.channel) return
    // don't want to check other channels
    if (message.channel.id !== this.channel || message.channel.type !== 'text') return
    // if using webhooks, ignore this!
    if (message.webhookID) ***REMOVED***
      // backwards compatability with older config
      if (this.config.USE_WEBHOOKS && this.config.IGNORE_WEBHOOKS === undefined) return

      // if ignoring all webhooks, ignore
      if (this.config.IGNORE_WEBHOOKS) ***REMOVED***
        return
      ***REMOVED*** else if (this.config.USE_WEBHOOKS) ***REMOVED***
        // otherwise, ignore all webhooks that are not the same as this one
        const ***REMOVED*** id ***REMOVED*** = this.parseDiscordWebhook(this.config.WEBHOOK_URL)
        if (id === message.webhookID) ***REMOVED***
          if (this.config.DEBUG) console.log('[INFO] Ignoring webhook from self')
          return
        ***REMOVED***
      ***REMOVED***
    ***REMOVED***
    // if the same user as the bot, ignore
    if (message.author.id === this.client.user.id) return
    // ignore any attachments
    if (message.attachments.array().length) return

    const rcon = new Rcon(this.config.MINECRAFT_SERVER_RCON_IP, this.config.MINECRAFT_SERVER_RCON_PORT, this.config.DEBUG)
    try ***REMOVED***
      await rcon.auth(this.config.MINECRAFT_SERVER_RCON_PASSWORD)
    ***REMOVED*** catch (e) ***REMOVED***
      console.log('[ERROR] Could not auth with the server!')
      if (this.config.DEBUG) console.error(e)
    ***REMOVED***

    let command = ''
    if (this.config.ALLOW_SLASH_COMMANDS && this.config.SLASH_COMMAND_ROLES && message.cleanContent.startsWith('/')) ***REMOVED***
      const author = message.member
      if (author.roles.find(r => this.config.SLASH_COMMAND_ROLES.includes(r.name))) ***REMOVED***
        // send the raw command, can be dangerous...
        command = message.cleanContent
      ***REMOVED*** else ***REMOVED***
        console.log('[INFO] User attempted a slash command without a role')
      ***REMOVED***
    ***REMOVED*** else ***REMOVED***
      command = `tellraw @a $***REMOVED***this.makeMinecraftTellraw(message)***REMOVED***`
    ***REMOVED***

    if (this.config.DEBUG) console.log(`[DEBUG] Sending command "$***REMOVED***command***REMOVED***" to the server`)

    if (command) ***REMOVED***
      await rcon.command(command).catch((e) => ***REMOVED***
        console.log('[ERROR] Could not send command!')
        if (this.config.DEBUG) console.error(e)
      ***REMOVED***)
    ***REMOVED***
    rcon.close()
  ***REMOVED***

  private makeMinecraftTellraw(message: Message): string ***REMOVED***
    const variables: ***REMOVED***[index: string]: string***REMOVED*** = ***REMOVED***
      username: emojiStrip(message.author.username),
      nickname: message.member.nickname ? emojiStrip(message.member.nickname) : emojiStrip(message.author.username),
      discriminator: message.author.discriminator,
      text: emojiStrip(message.cleanContent)
    ***REMOVED***
    // hastily use JSON to encode the strings
    for (const v of Object.keys(variables)) ***REMOVED***
      variables[v] = JSON.stringify(variables[v]).slice(1,-1)
    ***REMOVED***

    return this.config.MINECRAFT_TELLRAW_TEMPLATE
      .replace(/%username%/g, variables.username)
      .replace(/%nickname%/g, variables.nickname)
      .replace(/%discriminator%/g, variables.discriminator)
      .replace(/%message%/g, variables.text)
  ***REMOVED***

  private replaceDiscordMentions(message: string): string ***REMOVED***
    const possibleMentions = message.match(/@[^#\s]*[#]?[0-9]***REMOVED***4***REMOVED***/gim)
    if (possibleMentions) ***REMOVED***
      for (let mention of possibleMentions) ***REMOVED***
        const mentionParts = mention.split('#')
        let username = mentionParts[0].replace('@', '')
        if (mentionParts.length > 1) ***REMOVED***
          if (this.config.ALLOW_USER_MENTIONS) ***REMOVED***
            const user = this.client.users.find(user => user.username === username && user.discriminator === mentionParts[1])
            if (user) ***REMOVED***
              message = message.replace(mention, '<@' + user.id + '>')
            ***REMOVED***
          ***REMOVED***
        ***REMOVED***

        if (['here', 'everyone'].includes(username)) ***REMOVED***
          // remove these large pings
          if (!this.config.ALLOW_HERE_EVERYONE_MENTIONS) ***REMOVED***
            message = message
              .replace('@everyone', '@ everyone')
              .replace('@here', '@ here')
          ***REMOVED***
        ***REMOVED***
      ***REMOVED***
    ***REMOVED***
    return message
  ***REMOVED***

  private makeDiscordWebhook (username: string, message: string) ***REMOVED***
    message = this.replaceDiscordMentions(message)

    let avatarURL
    if (username === this.config.SERVER_NAME + ' - Server') ***REMOVED*** // use avatar for the server
      avatarURL = this.config.SERVER_IMAGE || 'https://minotar.net/helm/Steve/256.png'
    ***REMOVED*** else ***REMOVED*** // use avatar for player
      avatarURL = `https://minotar.net/helm/$***REMOVED***username***REMOVED***/256.png`
    ***REMOVED***

    return ***REMOVED***
      username: username,
      content: message,
      'avatar_url': avatarURL,
    ***REMOVED***
  ***REMOVED***

  private makeDiscordMessage(username: string, message: string) ***REMOVED***
    message = this.replaceDiscordMentions(message)

    return this.config.DISCORD_MESSAGE_TEMPLATE
      .replace('%username%', username)
      .replace('%message%', message)
  ***REMOVED***

  public async sendMessage (username: string, message: string) ***REMOVED***
    if (this.config.USE_WEBHOOKS) ***REMOVED***
      const webhook = this.makeDiscordWebhook(username, message)
      try ***REMOVED***
        await axios.post(this.config.WEBHOOK_URL, webhook, ***REMOVED*** headers: ***REMOVED*** 'Content-Type': 'application/json' ***REMOVED*** ***REMOVED***)
      ***REMOVED*** catch (e) ***REMOVED***
        console.log('[ERROR] Could not send Discord message through WebHook!')
        if (this.config.DEBUG) console.log(e)
      ***REMOVED***
    ***REMOVED*** else ***REMOVED***
      // find the channel
      const channel = this.client.channels.find((ch) => ch.id === this.config.DISCORD_CHANNEL_ID && ch.type === 'text') as TextChannel
      if (channel) ***REMOVED***
        await channel.send(this.makeDiscordMessage(username, message))
      ***REMOVED*** else ***REMOVED***
        console.log(`[ERROR] Could not find channel with ID $***REMOVED***this.config.DISCORD_CHANNEL_ID***REMOVED***!`)
      ***REMOVED***
    ***REMOVED***
  ***REMOVED***
***REMOVED***

export default Discord
