// FILEPATH: /tests/MinecraftHandler.test.ts
import MinecraftHandler from "./MinecraftHandler";
import ***REMOVED*** Config ***REMOVED*** from "./Config";

describe("MinecraftHandler", () => ***REMOVED***
  let minecraftHandler: MinecraftHandler;
    let config: Config;
  beforeEach(async () => ***REMOVED***
    const configFile =
      process.argv.length > 2 ? process.argv[2] : "../config.json";
    console.log("[INFO] Using configuration file:", configFile);
    config = require(configFile);

    minecraftHandler = new MinecraftHandler(config);
  ***REMOVED***);

  describe("parseLogLine", () => ***REMOVED***
    it("should correctly parse a player chat log line", () => ***REMOVED***
      const logLine =
        "[23:37:13] [Server thread/INFO]: [Not Secure] <Otoris> test";
      const result = minecraftHandler.parseLogLine(logLine);
      expect(result).toEqual(***REMOVED***
        username: "Otoris",
        message: "test",
      ***REMOVED***);
    ***REMOVED***);

    it("should correctly parse a player join log line", () => ***REMOVED***
      const logLine = "[23:34:38] [Server thread/INFO]: Otoris joined the game";
      const result = minecraftHandler.parseLogLine(logLine);
      expect(result).toEqual(***REMOVED***
        username: `$***REMOVED***config.SERVER_NAME***REMOVED*** - Server`,
        message: "Otoris joined the game",
      ***REMOVED***);
    ***REMOVED***);

    it("should correctly parse a player disconnect log line", () => ***REMOVED***
      const logLine = "[23:34:36] [Server thread/INFO]: Otoris left the game";
      const result = minecraftHandler.parseLogLine(logLine);
      expect(result).toEqual(***REMOVED***
        username: `$***REMOVED***config.SERVER_NAME***REMOVED*** - Server`,
        message: "Otoris left the game",
      ***REMOVED***);
    ***REMOVED***);

    it("should correctly parse a player death log line", () => ***REMOVED***
      const logLine =
        "[23:39:37] [Server thread/INFO]: Otoris was slain by Zombie";
      const result = minecraftHandler.parseLogLine(logLine);
      expect(result).toEqual(***REMOVED***
        username: `$***REMOVED***config.SERVER_NAME***REMOVED*** - Server`,
        message: "Otoris was slain by Zombie",
      ***REMOVED***);
    ***REMOVED***);

    // Add more test cases as needed
  ***REMOVED***);
***REMOVED***);
