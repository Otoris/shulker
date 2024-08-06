import {
  ChannelType,
  Client,
  GatewayIntentBits,
  Message,
  Snowflake,
  TextChannel,
  Events
} from "discord.js";

import emojiStrip from "emoji-strip";
import axios from "axios";

import { Config } from "./Config";

import Rcon from "./Rcon";

class Discord {
  config: Config;
  client: Client;

  channel: Snowflake;

  constructor(config: Config, onReady?: () => void) {
    this.config = config;
    this.channel = config.DISCORD_CHANNEL_ID || "";

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildWebhooks
      ]
    }); // or specify the required intents
    if (onReady) this.client.once(Events.ClientReady, () => onReady());

    this.client.on("messageCreate", (message: Message) => this.onMessage(message));

  }

  private logDebug(message: string, data?: any) {
    if (this.config.DEBUG) {
      console.log(`[DEBUG] ${message}`, data);
    }
  }

  private logError(message: string, data?: any) {
    console.log(`[ERROR] ${message}`, data);
  }

  public async init() {
    try {
      this.logDebug("Authenticating with Discord...");
      await this.client.login(this.config.DISCORD_TOKEN);
      if (this.config.DISCORD_CHANNEL_NAME && !this.config.DISCORD_CHANNEL_ID) {
        this.logDebug("Getting channel ID from name " + this.config.DISCORD_CHANNEL_NAME);
        this.getChannelIdFromName(this.config.DISCORD_CHANNEL_NAME);
      }
      this.logDebug("Authenticated with Discord!");
    } catch (e) {
      this.logError("[ERROR] Could not authenticate with Discord: " + e);
    }
  }

  private getChannelIdFromName(name: string) {
    // remove the # if there is one
    if (name.startsWith("#")) name = name.substring(1, name.length);
    // @ts-ignore
    const channel: TextChannel = this.client.channels.find(
      (c: TextChannel) => c.type === ChannelType.GuildText && c.name === name
    );
    if (channel) {
      this.channel = channel.id;
      this.logDebug(
        `Found channel #${channel.name} (id: ${channel.id}) in the server "${channel.guild.name}"`
      );
    } else {
      this.logDebug(
        `Could not find channel ${name}! Check that the name is correct or use the ID of the channel instead (DISCORD_CHANNEL_ID)!`
      );
      process.exit(1);
    }
  }

  private parseDiscordWebhook(url: string) {
    const re = /discordapp.com\/api\/webhooks\/([^\/]+)\/([^\/]+)/;

    // the is of the webhook
    let id = null;
    let token = null;

    if (!re.test(url)) {
      // In case the url changes at some point, I will warn if it still works
      this.logDebug("The Webhook URL may not be valid!");
    } else {
      const match = url.match(re);
      if (match) {
        id = match[1];
        token = match[2];
      }
    }

    return { id, token };
  }

  private async onMessage(message: Message) {
    this.logDebug("Received message from Discord!");
    // no channel, done
    if (!this.channel) {
      this.logDebug("No channel recieved, ignoring message");
      return;
    }
    this.logDebug("Channel recieved message from: " + this.channel);
    // don't want to check other channels
    if (message.channel.id !== this.channel || ChannelType.GuildText) {
      this.logDebug("Message is not in the correct channel!");
      return;
    }
    this.logDebug("Message is in the correct channel!");
    // if using webhooks, ignore this!
    if (message.webhookId) {
      this.logDebug("Message is from a webhook!");
      // backwards compatability with older config
      if (this.config.USE_WEBHOOKS && this.config.IGNORE_WEBHOOKS === undefined) {
        this.logDebug("Ignoring all webhooks due to config - end onMessage");
        return;
      }

      // if ignoring all webhooks, ignore
      if (this.config.IGNORE_WEBHOOKS) {
        this.logDebug("Ignoring all webhooks");
        return;
      } else if (this.config.USE_WEBHOOKS) {
        // otherwise, ignore all webhooks that are not the same as this one
        const { id } = this.parseDiscordWebhook(this.config.WEBHOOK_URL);
        if (id === message.webhookId) {
          this.logDebug("Ignoring webhook from self");
          return;
        }
      }
    }
    // if the same user as the bot, ignore
    if (message.author.id === this.client?.user?.id) {
      this.logDebug("Ignoring message from self");
      return;
    }
    // ignore any attachments
    if (Array.from(message.attachments.values()).length) {
      this.logDebug("Ignoring message with attachments");
      return;
    }

    const rcon = new Rcon(
      this.config.MINECRAFT_SERVER_RCON_IP,
      this.config.MINECRAFT_SERVER_RCON_PORT,
      this.config.DEBUG
    );
    try {
      await rcon.auth(this.config.MINECRAFT_SERVER_RCON_PASSWORD);
      this.logDebug("Authenticated with the server!");
    } catch (e) {
      this.logError("Could not auth with the server!");
    }

    let command = "";
    if (
      this.config.ALLOW_SLASH_COMMANDS &&
      this.config.SLASH_COMMAND_ROLES &&
      message.cleanContent.startsWith("/")
    ) {
      this.logDebug("Slash command detected...");
      const author = message.member;
      if (
        author?.roles.cache.find((r) =>
          this.config.SLASH_COMMAND_ROLES.includes(r.name)
        )
      ) {
        this.logDebug("User has a role to use slash commands");
        // send the raw command, can be dangerous...
        command = message.cleanContent;
      } else {
        this.logDebug("User attempted a slash command without a role...");
      }
    } else {
      this.logDebug("Creating a command with makeMinecraftTellRaw...");
      command = `tellraw @a ${this.makeMinecraftTellraw(message)}`;
    }

    this.logDebug(`Sending command "${command}" to the server`);

    if (command) {
      await rcon.command(command).catch((e) => {
        this.logError("Could not send command!");
      });
    }
    rcon.close();
  }

  private makeMinecraftTellraw(message: Message): string {
    const variables: { [index: string]: string } = {
      username: emojiStrip(message.author.username),
      nickname: message?.member?.nickname
        ? emojiStrip(message.member.nickname)
        : emojiStrip(message.author.username),
      discriminator: message.author.discriminator,
      text: emojiStrip(message.cleanContent),
    };
    // hastily use JSON to encode the strings
    for (const v of Object.keys(variables)) {
      variables[v] = JSON.stringify(variables[v]).slice(1, -1);
    }
    this.logDebug("Variables for tellraw:", variables);

    const result = this.config.MINECRAFT_TELLRAW_TEMPLATE.replace(
      /%username%/g,
      variables.username
    )
      .replace(/%nickname%/g, variables.nickname)
      .replace(/%discriminator%/g, variables.discriminator)
      .replace(/%message%/g, variables.text);

    this.logDebug("Resulting tellraw:", result);

    return result;
  }

  private replaceDiscordMentions(message: string): string {
    const possibleMentions = message.match(/@[^#\s]*[#]?[0-9]{4}/gim);
    if (possibleMentions) {
      for (let mention of possibleMentions) {
        const mentionParts = mention.split("#");
        let username = mentionParts[0].replace("@", "");
        if (mentionParts.length > 1) {
          if (this.config.ALLOW_USER_MENTIONS) {
            const user = this.client.users.cache.find(
              (user) =>
                user.username === username &&
                user.discriminator === mentionParts[1]
            );
            if (user) {
              message = message.replace(mention, "<@" + user.id + ">");
            }
          }
        }

        if (["here", "everyone"].includes(username)) {
          // remove these large pings
          if (!this.config.ALLOW_HERE_EVERYONE_MENTIONS) {
            message = message
              .replace("@everyone", "@ everyone")
              .replace("@here", "@ here");
          }
        }
      }
    }
    return message;
  }

  private makeDiscordWebhook(username: string, message: string) {
    message = this.replaceDiscordMentions(message);

    let avatarURL;
    if (username === this.config.SERVER_NAME + " - Server") {
      // use avatar for the server
      avatarURL =
        this.config.SERVER_IMAGE || "https://minotar.net/helm/Steve/256.png";
    } else {
      // use avatar for player
      avatarURL = `https://minotar.net/helm/${username}/256.png`;
    }

    return {
      username: username,
      content: message,
      avatar_url: avatarURL,
    };
  }

  private makeDiscordMessage(username: string, message: string) {
    message = this.replaceDiscordMentions(message);

    return this.config.DISCORD_MESSAGE_TEMPLATE.replace(
      "%username%",
      username
    ).replace("%message%", message);
  }

  public async sendMessage(username: string, message: string) {
    if (this.config.USE_WEBHOOKS) {
      const webhook = this.makeDiscordWebhook(username, message);
      try {
        await axios.post(this.config.WEBHOOK_URL, webhook, {
          headers: { "Content-Type": "application/json" },
        });
      } catch (e) {
        this.logError("Could not send Discord message through Webhook!");
      }
    } else {
      // find the channel
      const channel = this.client.channels.cache.find(
        (ch) =>
          ch.id === this.config.DISCORD_CHANNEL_ID &&
          ch.type === ChannelType.GuildText
      ) as TextChannel;
      if (channel) {
        await channel.send(this.makeDiscordMessage(username, message));
      } else {
        this.logError(
          `Could not find channel with ID ${this.config.DISCORD_CHANNEL_ID}!`
        );
      }
    }
  }
}

export default Discord;
