import DiscordClient from "./Discord";
import MinecraftHandler, { LogLine } from "./MinecraftHandler";

import { Config } from "./Config";

class Shulker {
  config: Config;
  discordClient: DiscordClient;
  minecraftHandler: MinecraftHandler;

  constructor() {
    const configFile =
      process.argv.length > 2
        ? process.argv[2]
        : process.env.CONFIG_PATH || "../config.json";
    this.config = require(configFile);
    this.logDebug("Using configuration file:", configFile);
    if (!this.config) {
      this.logError("Could not load configuration file");
    }

    if (this.config.USE_WEBHOOKS) {
      this.logDebug("Using Discord Webhooks to send messages");
    } else {
      this.logDebug("Using the Discord bot to send messages");
    }
  }

  logDebug(message: string, data?: any) {
    if (this.config.DEBUG) {
      console.log(`[DEBUG] ${message}`, data);
    }
  }

  logError(message: string, data?: any) {
    console.log(`[ERROR] ${message}`, data);
  }

  onDiscordReady() {
    this.minecraftHandler.init(async (data: LogLine) => {
      this.logDebug("Initalizing minecraftHandler callback");
      if (data) {
        this.logDebug("Received data from MinecraftHandler", data);
        const { username, message } = data;
        await this.discordClient.sendMessage(username, message);
      }
    });
  }

  async init() {
    this.logDebug("Loading config...");
    if (!this.config) return;
    this.logDebug("Config loaded");

    this.discordClient = new DiscordClient(this.config, () =>
      this.onDiscordReady()
    );
    this.minecraftHandler = new MinecraftHandler(this.config);

    await this.discordClient.init();
  }
}

export default Shulker;
