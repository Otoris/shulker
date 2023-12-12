export interface Config ***REMOVED***
  PORT: number

  USE_WEBHOOKS: boolean
  WEBHOOK_URL: string
  IGNORE_WEBHOOKS: string
  DISCORD_TOKEN: string
  DISCORD_CHANNEL_ID: string
  DISCORD_CHANNEL_NAME: string
  DISCORD_MESSAGE_TEMPLATE: string

  MINECRAFT_SERVER_RCON_IP: string
  MINECRAFT_SERVER_RCON_PORT: number
  MINECRAFT_SERVER_RCON_PASSWORD: string
  MINECRAFT_TELLRAW_TEMPLATE: string

  IS_LOCAL_FILE: boolean
  LOCAL_FILE_PATH: string

  PATH_TO_MINECRAFT_SERVER_INSTALL?: string
  YOUR_URL?: string

  SHOW_INIT_MESSAGE: boolean

  ALLOW_USER_MENTIONS: boolean
  ALLOW_HERE_EVERYONE_MENTIONS: boolean
  ALLOW_SLASH_COMMANDS: boolean
  SLASH_COMMAND_ROLES: string[]

  WEBHOOK: string
  REGEX_SERVER_PREFIX: string
  REGEX_MATCH_CHAT_MC: string
  REGEX_IGNORED_CHAT: string
  REGEX_DEATH_MESSAGE: string
  DEBUG: boolean

  SERVER_NAME: string
  SERVER_IMAGE: string
  SHOW_PLAYER_CONN_JOIN: boolean
  SHOW_PLAYER_CONN_LEAVE: boolean
  SHOW_PLAYER_ADVANCEMENT: boolean
  SHOW_PLAYER_DEATH: boolean
  SHOW_PLAYER_ME: boolean
  DEATH_KEY_WORDS: string[]
***REMOVED***
