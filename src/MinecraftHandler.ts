import fs from "fs";
import path from "path";
import { Tail } from "tail";
import express from "express";

import { Config } from "./Config";

export type LogLine = {
  username: string;
  message: string;
} | null;

type Callback = (data: LogLine) => void;

class MinecraftHandler {
  config: Config;

  app: express.Application;
  tail: Tail;

  constructor(config: Config) {
    this.config = config;
  }

  private static fixMinecraftUsername(username: string) {
    return username.replace(/(§[A-Z-a-z0-9])/g, "");
  }

  private isIgnoredLine(data: string): boolean {
    const ignored = new RegExp(this.config.REGEX_IGNORED_CHAT);
    return ignored.test(data) || data.includes("Rcon connection");
  }

  private logDebug(message: string, data?: any) {
    if (this.config.DEBUG) {
      console.log(`[DEBUG] ${message}`, data);
    }
  }

  private logError(message: string, data?: any) {
    console.log(`[ERROR] ${message}`, data);
  }

  private createLogLine(username: string, message: string): LogLine {
    return { username, message };
  }

  private handlePlayerChat(logLine: string): LogLine | null {
    this.logDebug("A player sent a chat message");

    const re = new RegExp(this.config.REGEX_MATCH_CHAT_MC);
    const matches = logLine.match(re);

    if (!matches) {
      this.logError("Could not parse message: " + logLine);
      return null;
    }

    const username = MinecraftHandler.fixMinecraftUsername(matches[1]);
    const message = matches[2];
    this.logDebug("Username: " + matches[1]);
    this.logDebug("Text: " + matches[2]);
    return this.createLogLine(username, message);
  }

  private handlePlayerJoin(
    logLine: string,
    serverUsername: string
  ): LogLine | null {
    this.logDebug("A player's connection status changed");

    const bukkitCheck = logLine.match(/.+?(?=\[\/)/);
    if (bukkitCheck) {
      return {
        username: serverUsername,
        message: `${bukkitCheck[0]} joined the game`,
      };
    } else {
      this.logDebug(`${serverUsername} ${logLine}`);
      return { username: serverUsername, message: logLine };
    }
  }

  private handlePlayerLeave(
    logLine: string,
    serverUsername: string
  ): LogLine | null {
    this.logDebug("A player disconnected");
    return { username: serverUsername, message: logLine };
  }

  private handlePlayerAdvancement(
    logLine: string,
    serverUsername: string
  ): LogLine | null {
    this.logDebug("A player has made an advancement", {
      username: `${this.config.SERVER_NAME} - Server`,
      message: logLine,
    });
    return {
      username: `${this.config.SERVER_NAME} - Server`,
      message: logLine,
    };
  }

  private handlePlayerMe(
    logLine: string,
    serverUsername: string
  ): LogLine | null {
    // /me commands have the bolded name and the action they did
    const usernameMatch = logLine.match(/^\* ([a-zA-Z0-9_]{1,16}) (.*)/);
    if (usernameMatch) {
      const username = usernameMatch[1];
      const rest = usernameMatch[2];
      return { username: serverUsername, message: `**${username}** ${rest}` };
    }
    return null;
  }

  private handlePlayerDeath(
    logLine: string,
    serverUsername: string
  ): LogLine | null {
    const deathMessageRegex = new RegExp(
      this.config.REGEX_DEATH_MESSAGE ?? "^[\\w_]+ died"
    );
    const deathMessageMatch = logLine.match(deathMessageRegex);

    if (deathMessageMatch) {
      this.logDebug(`A player died. Matched on "${deathMessageMatch[1]}"`);
      return { username: serverUsername, message: logLine };
    }
    return null;
  }

  public parseLogLine(data: string): LogLine {
    if (this.isIgnoredLine(data)) {
      this.logDebug("Line ignored");
      return null;
    }
  
    this.logDebug("Received " + data);
  
    const logLineDataRegex = new RegExp(
      `${this.config.REGEX_SERVER_PREFIX || "\\[Server thread/INFO\\]:"} (.*)`
    );
  
    // get the part after the log prefix, so all the actual data is here
    const logLineData = data.match(logLineDataRegex);
  
    if (!logLineDataRegex.test(data) || !logLineData) {
      this.logDebug("Regex could not match the string:");
      this.logDebug(
        'Received: "' +
          data +
          '", Regex matches lines that start with: "' +
          this.config.REGEX_SERVER_PREFIX +
          '"'
      );
      return null;
    }
  
    // Adjusted to correctly extract log line data
    const logLine = logLineData[2]; 
  
    this.logDebug("Parsing: " + logLine + " :or: " + logLineData);
  
    // Ensure logLine is defined before proceeding
    if (!logLine) {
      this.logDebug("logLine is undefined or null, skipping processing.");
      return null;
    }
  
    // the username used for server messages
    const serverUsername = `${this.config.SERVER_NAME} - Server`;
  
    return this.handleLogLine(logLine, serverUsername);
  }

  private handleLogLine(logLine: string, serverUsername: string): LogLine | null {
    // Ensure logLine is defined before using it
    if (!logLine) return null;
  
    if (logLine.startsWith("<")) {
      return this.handlePlayerChat(logLine);
    } else if (
      this.config.SHOW_PLAYER_CONN_JOIN &&
      logLine.includes("joined the game") //joined the game (vanilla)
    ) {
      return this.handlePlayerJoin(logLine, serverUsername);
    } else if (
      this.config.SHOW_PLAYER_CONN_LEAVE &&
      logLine.includes("left the game") //left the game (vanilla)
    ) {
      return this.handlePlayerLeave(logLine, serverUsername);
    } else if (
      this.config.SHOW_PLAYER_ADVANCEMENT &&
      logLine.includes("made the advancement")
    ) {
      return this.handlePlayerAdvancement(logLine, serverUsername);
    } else if (this.config.SHOW_PLAYER_ME && logLine.startsWith("* ")) {
      return this.handlePlayerMe(logLine, serverUsername);
    } else if (this.config.SHOW_PLAYER_DEATH) {
      return this.handlePlayerDeath(logLine, serverUsername);
    }
  
    return null;
  }

  private initWebServer(callback: Callback) {
    // init the webserver
    this.app = express();

    this.app.use((request, response, next) => {
      request.rawBody = "";
      request.setEncoding("utf8");

      request.on("data", (chunk: string) => {
        request.rawBody += chunk;
      });

      request.on("end", function () {
        next();
      });
    });

    this.app.post(this.config.WEBHOOK, (req, res) => {
      if (req.rawBody) {
        const logLine = this.parseLogLine(req.rawBody);
        callback(logLine);
      }
      res.json({ received: true });
    });

    const port: number = Number(process.env.PORT) || this.config.PORT;

    this.app.listen(port, () => {
      console.log("[INFO] Bot listening on *:" + port);

      if (!this.config.IS_LOCAL_FILE && this.config.SHOW_INIT_MESSAGE) {
        // in case someone inputs the actual path and url in the config here...
        let mcPath: string =
          this.config.PATH_TO_MINECRAFT_SERVER_INSTALL ||
          "PATH_TO_MINECRAFT_SERVER_INSTALL";
        const url: string = this.config.YOUR_URL || "YOUR_URL";

        const defaultPath = mcPath === "PATH_TO_MINECRAFT_SERVER_INSTALL";
        const defaultUrl = url === "YOUR_URL";

        console.log(
          "[INFO] Please enter the following command on your server running the Minecraft server:"
        );
        if (defaultPath) {
          console.log(
            '       Replace "PATH_TO_MINECRAFT_SERVER_INSTALL" with the path to your Minecraft server install' +
              (defaultUrl
                ? ' and "YOUR_URL" with the URL/IP of the server running Shulker.'
                : "")
          );
        } else {
          if (defaultUrl)
            console.log(
              '       Replace "YOUR_URL" with the URL/IP of the server running Shulker'
            );
        }

        mcPath =
          (defaultPath ? "/" : "") + path.join(mcPath, "/logs/latest.log");

        let grepMatch = ": <";
        if (
          this.config.SHOW_PLAYER_DEATH ||
          this.config.SHOW_PLAYER_ME ||
          this.config.SHOW_PLAYER_ADVANCEMENT ||
          this.config.SHOW_PLAYER_CONN_JOIN ||
          this.config.SHOW_PLAYER_CONN_LEAVE
        ) {
          grepMatch = this.config.REGEX_SERVER_PREFIX;
        }
        console.log(
          `  \`tail -F ${mcPath} | grep --line-buffered "${grepMatch}" | while read x ; do echo -ne $x | curl -X POST -d @- http://${url}:${port}${this.config.WEBHOOK} ; done\``
        );
        if (grepMatch !== ": <") {
          console.log(
            '       Please note that the above command can send a lot of requests to the server. Disable the non-text messages (such as "SHOW_PLAYER_CONN_STAT") to reduce this if necessary.'
          );
        }
      }
    });
  }

  private initTail(callback: Callback) {
    if (fs.existsSync(this.config.LOCAL_FILE_PATH)) {
      console.log(
        `[INFO] Using configuration for local log file at "${this.config.LOCAL_FILE_PATH}"`
      );
      this.tail = new Tail(this.config.LOCAL_FILE_PATH, { useWatchFile: true });
    } else {
      throw new Error(
        `[ERROR] Local log file not found at "${this.config.LOCAL_FILE_PATH}"`
      );
    }
    this.tail.on("line", (data: string) => {
      // Parse the line to see if we care about it
      let logLine = this.parseLogLine(data);
      if (data) {
        callback(logLine);
      }
    });
    this.tail.on("error", (error: any) => {
      console.log("[ERROR] Error tailing log file: " + error);
    });
  }

  public init(callback: Callback) {
    if (this.config.IS_LOCAL_FILE) {
      this.initTail(callback);
    } else {
      this.initWebServer(callback);
    }
  }
}

export default MinecraftHandler;
