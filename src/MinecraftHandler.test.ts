// FILEPATH: /tests/MinecraftHandler.test.ts
import MinecraftHandler from "./MinecraftHandler";
import { Config } from "./Config";

describe("MinecraftHandler", () => {
  let minecraftHandler: MinecraftHandler;
  let config: Config;
  beforeEach(async () => {
    const configFile =
      process.argv.length > 2 ? process.argv[2] : "../config.example.json";
    console.log("[INFO] Using configuration file:", configFile);
    config = require(configFile);
    config.SHOW_PLAYER_ADVANCEMENT = true;

    minecraftHandler = new MinecraftHandler(config);
  });

  describe("parseLogLine", () => {
    it("should correctly parse a player chat log line", () => {
      const logLine =
        "[23:37:13] [Server thread/INFO]: [Not Secure] <Otoris> test";
      const result = minecraftHandler.parseLogLine(logLine);
      expect(result).toEqual({
        username: "Otoris",
        message: "test",
      });
    });

    it("should correctly parse a player join log line", () => {
      const logLine = "[23:34:38] [Server thread/INFO]: Otoris joined the game";
      const result = minecraftHandler.parseLogLine(logLine);
      expect(result).toEqual({
        username: `${config.SERVER_NAME} - Server`,
        message: "Otoris joined the game",
      });
    });

    it("should correctly parse a player disconnect log line", () => {
      const logLine = "[23:34:36] [Server thread/INFO]: Otoris left the game";
      const result = minecraftHandler.parseLogLine(logLine);
      expect(result).toEqual({
        username: `${config.SERVER_NAME} - Server`,
        message: "Otoris left the game",
      });
    });

    it("should correctly parse a player death log line", () => {
      const logLine =
        "[23:39:37] [Server thread/INFO]: Otoris was slain by Zombie";
      const result = minecraftHandler.parseLogLine(logLine);
      expect(result).toEqual({
        username: `${config.SERVER_NAME} - Server`,
        message: "Otoris was slain by Zombie",
      });
    });

    it("should correctly parse a player advancement log line", () => {
      const logLine =
        "[10:40:34] [Server thread/INFO]: Otoris has made the advancement [Monster Hunter]";
      const result = minecraftHandler.parseLogLine(logLine);
      expect(result).toEqual({
        username: `${config.SERVER_NAME} - Server`,
        message: "Otoris has made the advancement [Monster Hunter]",
      });
    });

    it("should correctly parse a /me command log line", () => {
      const logLine = "[23:39:37] [Server thread/INFO]: * Otoris waves hello";
      const result = minecraftHandler.parseLogLine(logLine);
      expect(result).toEqual({
        username: `${config.SERVER_NAME} - Server`,
        message: "**Otoris** waves hello",
      });
    });

    it("should return null for ignored log lines", () => {
      const logLine =
        "[23:39:37] [Server thread/INFO]: Rcon connection from: /127.0.0.1";
      const result = minecraftHandler.parseLogLine(logLine);
      expect(result).toBeNull();
    });
  });
});
