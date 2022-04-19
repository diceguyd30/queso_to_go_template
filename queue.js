const settings = require('./settings.js');
const twitch = require('./twitch.js').twitch();
const fs = require('fs');

var current_level = undefined;
var levels = new Array();
const cache_filename = "queso.save";

const isValidLevelCode = (level_code) => {
  const level_bit = '[A-Ha-hJ-Nj-nP-Yp-y0-9]{3}';
  const delim_bit = '[-. ]?';
  const valid_level_code = level_bit + delim_bit + level_bit + delim_bit + level_bit;
  return level_code.match(valid_level_code);
};

const queue = {
  add: (level) => {
    if (levels.length >= settings.max_size) {
      return "Sorry, the level queue is full!";
    }
    if (!isValidLevelCode(level.code)) {
      return "I'm pretty sure '" + level.code + "' isn't a valid code. Try again.";
    }
    if (current_level != undefined && current_level.submitter == level.submitter && level.submitter != settings.channel) {
      return "Wait for your level to be completed before you submit again.";
    }

    var result = levels.find(x => x.submitter == level.submitter);
    if (result == undefined || level.submitter == settings.channel) {
      levels.push(level);
      queue.save();
      return level.submitter + ", " + level.code + " has been added to the queue.";
    } else {
      return "Sorry, viewers are limited to one submission at a time.";
    }
  },

  modRemove: (usernameArgument) => {
    if (usernameArgument == '') {
      return "You can use !remove <username> to kick out someone else's level;  if you want to skip the current one, use !next.";
    }

    var match = queue.matchUsername(usernameArgument);
    if (!levels.some(match)) {
      return "No levels from " + usernameArgument + " in the queue.";
    }
    levels = levels.filter(level => !match(level));
    return "Ok, I removed " + usernameArgument + "'s level from the queue.";
  },

  remove: (username) => {
    if (current_level != undefined && current_level.submitter == username) {
      return "We're playing that level right now!  Don't take this away from us!";
    }
    levels = levels.filter(x => x.submitter != username);
    return username + "'s level removed from the queue.";
  },

  replace: (username, new_level_code) => {
    if (!isValidLevelCode(new_level_code)) {
      return "I'm pretty sure '" + new_level_code + "' isn't a valid code.  Try again.";
    }
    var old_level = levels.find(x => x.submitter == username);
    if (old_level != undefined) {
      old_level.code = new_level_code;
      queue.save();
      return "Ok " + username + ", your code in the queue is now " + new_level_code + ".";
    } else if (current_level != undefined && current_level.submitter == username) {
      current_level.code = new_level_code;
      queue.save();
      return "Ok " + username + ", your code in the queue is now " + new_level_code + ".";
    } else {
      return "I didn't find a level for " + username + " in the queue. Use !add to add one.";
    }
  },

  position: async (username) => {
    if (current_level != undefined && current_level.submitter == username) {
      return 0;
    }
    if (levels.length == 0) {
      return -1;
    }

    var list = await queue.list();
    var both = list.online.concat(list.offline);
    var index = both.findIndex(x => x.submitter == username);
    if (index != -1) {
      return (index + 1) + ((current_level != undefined) ? 1 : 0);
    }
    return -1;
  },

  punt: async () => {
    if (current_level === undefined) {
      return "The nothing you aren't playing cannot be punted.";
    }
    var top = current_level;
    current_level = undefined;
    queue.add(top);
    return 'Ok, adding the current level back into the queue.';
  },

  next: async () => {
    var list = await queue.list();
    var both = list.online.concat(list.offline);
    if (both.length === 0) {
      current_level = undefined;
    } else {
      current_level = both.shift();
    }
    var index = levels.findIndex(x => x.code == current_level.code);
    levels.splice(index, 1);
    queue.save();
    return current_level;
  },

  subnext: async () => {
    var list = await queue.sublist();
    var both = list.online.concat(list.offline);
    if (both.length === 0) {
      current_level = undefined;
    } else {
      current_level = both.shift();
    }
    var index = levels.findIndex(x => x.code == current_level.code);
    levels.splice(index, 1);
    queue.save();
    return current_level;
  },

  modnext: async () => {
    var list = await queue.modlist();
    var both = list.online.concat(list.offline);
    if (both.length === 0) {
      current_level = undefined;
    } else {
      current_level = both.shift();
    }
    var index = levels.findIndex(x => x.code == current_level.code);
    levels.splice(index, 1);
    queue.save();
    return current_level;
  },

  dip: (usernameArgument) => {
    var index = levels.findIndex(queue.matchUsername(usernameArgument));
    if (index != -1) {
      current_level = levels[index];
      levels.splice(index, 1);
      queue.save();
      return current_level;
    }
    return undefined;
  },

  current: () => {
    return current_level;
  },

  random: async () => {
    var list = await queue.list();
    var eligible_levels = list.online;
    if (eligible_levels.length == 0) {
      eligible_levels = list.offline;
      if (eligible_levels.length == 0) {
        current_level = undefined;
        return current_level;
      }
    }

    var random_index = Math.floor(Math.random() * eligible_levels.length);
    current_level = eligible_levels[random_index];
    var index = levels.findIndex(x => x.code == current_level.code);
    levels.splice(index, 1);
    queue.save();
    return current_level;
  },

  subrandom: async () => {
    var list = await queue.sublist();
    var eligible_levels = list.online;
    if (eligible_levels.length == 0) {
      eligible_levels = list.offline;
      if (eligible_levels.length == 0) {
        current_level = undefined;
        return current_level;
      }
    }

    var random_index = Math.floor(Math.random() * eligible_levels.length);
    current_level = eligible_levels[random_index];
    var index = levels.findIndex(x => x.code == current_level.code);
    levels.splice(index, 1);
    queue.save();
    return current_level;
  },

  modrandom: async () => {
    var list = await queue.modlist();
    var eligible_levels = list.online;
    if (eligible_levels.length == 0) {
      eligible_levels = list.offline;
      if (eligible_levels.length == 0) {
        current_level = undefined;
        return current_level;
      }
    }

    var random_index = Math.floor(Math.random() * eligible_levels.length);
    current_level = eligible_levels[random_index];
    var index = levels.findIndex(x => x.code == current_level.code);
    levels.splice(index, 1);
    queue.save();
    return current_level;
  },

  list: async () => {
    var online = new Array();
    var offline = new Array();
    await twitch.getOnlineUsers(settings.channel).then(online_users => {
      online = levels.filter(x => online_users.has(x.username));
      offline = levels.filter(x => !online_users.has(x.username));
    });
    return {
      online: online,
      offline: offline
    };
  },

  sublist: async () => {
    var online = new Array();
    var offline = new Array();
    await twitch.getOnlineSubscribers(settings.channel).then(online_users => {
      online = levels.filter(x => online_users.has(x.username));
      offline = levels.filter(x => !online_users.has(x.username));
    });
    return {
      online: online,
      offline: offline
    };
  },

  modlist: async () => {
    var online = new Array();
    var offline = new Array();
    await twitch.getOnlineMods(settings.channel).then(online_users => {
      online = levels.filter(x => online_users.has(x.username));
      offline = levels.filter(x => !online_users.has(x.username));
    });
    return {
      online: online,
      offline: offline
    };
  },

  matchUsername: (usernameArgument) => {
    usernameArgument = usernameArgument.trim().replace(/^@/, '');
    return level => {
      // display name (submitter) or user name (username) matches
      return level.submitter == usernameArgument || level.username == usernameArgument;
    };
  },

  save: () => {
    var levels_to_save = levels;
    if (current_level != undefined) {
      levels_to_save = [current_level].concat(levels_to_save);
    }
    var new_data = JSON.stringify(levels_to_save, null, 2);
    fs.writeFileSync(cache_filename, new_data);
  },

  load: () => {
    if (fs.existsSync(cache_filename)) {
      var raw_data = fs.readFileSync(cache_filename);
      levels = JSON.parse(raw_data);
      const username_missing = level => !level.hasOwnProperty('username');
      if (levels.some(username_missing)) {
        console.warn(`Usernames are not set in the file ${cache_filename}!`);
        console.warn('Assuming that usernames are lowercase Display Names which does work with Localized Display Names.');
        console.warn('To be safe, clear the queue with !clear.');
        levels.forEach(level => {
          if (username_missing(level)) {
            level.username = level.submitter.toLowerCase();
          }
        });
      }
      current_level = undefined;
    }
  },

  clear: () => {
    current_level = undefined;
    levels = new Array();
    queue.save();
  }
};

module.exports = {
  quesoqueue: () => { return queue; }
};
