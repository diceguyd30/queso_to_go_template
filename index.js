const settings = require('./settings.js');
const chatbot = require('./chatbot.js');
const quesoqueue = require('./queue.js').quesoqueue();
const twitch = require('./twitch.js').twitch();
const timer = require('./timer.js');

quesoqueue.load();

var queue_open = false;
var selection_iter = 0;
const level_timer = timer.timer(
  () => {
    chatbot_helper.say(`@${settings.channel} the timer has expired for this level!`);
  },
  settings.level_timeout * 1000 * 60
);

const get_remainder = x => {
  var index = x.indexOf(' ');
  if (index == -1) {
    return '';
  }
  return x.substr(index + 1);
};

const Level = (level_code, submitter, username) => {
  return { code: level_code, submitter: submitter, username: username };
};

var can_list = true;
const level_list_message = (sender, current, levels) => {
  if (
    current === undefined &&
    levels.online.length === 0 &&
    levels.offline.length === 0
  ) {
    return 'There are no levels in the queue :c';
  }
  var result =
    levels.online.length +
    (current !== undefined ? 1 : 0) +
    ' online: ';
  result +=
    current !== undefined
      ? current.submitter + ' (current)'
      : '(no current level)';

  result += levels.online.slice(0, 5).reduce((acc, x) => acc + ', ' + x.submitter, '');
  result +=
    '...' + (levels.online.length > 5 ? 'etc.' : '') +
    ' (' + levels.offline.length +
    ' offline)';
  return result;
};

const next_level_message = level => {
  if (level === undefined) {
    return 'The queue is empty.  Feed me levels!';
  }
  return 'Next is ' + level.code + ', submitted by ' + level.submitter;
};

const current_level_message = level => {
  if (level === undefined) {
    return "We're not playing a level right now! D:";
  }
  return (
    'Currently playing ' + level.code + ', submitted by ' + level.submitter
  );
};

const get_ordinal = num => {
  var ends = ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'];
  if (num % 100 >= 11 && num % 100 <= 13) {
    return num + 'th';
  }
  return num + ends[num % 10];
};

const position_message = async (position, sender) => {
  if (position == -1) {
    return (
      sender + ", looks like you're not in the queue. Try !add AAA-AAA-AAA."
    );
  } else if (position === 0) {
    return 'Your level is being played right now!';
  }
  return sender + ', you are currently ' + get_ordinal(position);
};

// What the bot should do when someone sends a message in chat.
// `message` is the full text of the message. `sender` is the username
// of the person that sent the message.
async function HandleMessage(message, sender, respond) {
  if (sender.username === undefined || message === undefined) {
    console.log('undefined data');
  }
  twitch.noticeChatter(sender);
  if (message == '!open' && sender.isBroadcaster) {
    queue_open = true;
    respond('The queue is now open!');
  } else if (message == '!close' && sender.isBroadcaster) {
    queue_open = false;
    respond('The queue is now closed!');
  } else if (message.startsWith('!add')) {
    if (queue_open || sender.isBroadcaster) {
      let level_code = get_remainder(message);
      respond(quesoqueue.add(Level(level_code, sender.displayName, sender.username)));
    } else {
      respond('Sorry, the queue is closed right now :c');
    }
  } else if (message.startsWith('!remove') || message.startsWith('!leave')) {
    if (sender.isBroadcaster) {
      var to_remove = get_remainder(message);
      respond(quesoqueue.modRemove(to_remove));
    } else {
      respond(quesoqueue.remove(sender.displayName));
    }
  } else if (
    message.startsWith('!replace') ||
    message.startsWith('!change') ||
    message.startsWith('!swap')
  ) {
    respond(quesoqueue.replace(sender.displayName, get_remainder(message)));
  } else if (message == '!level' && sender.isBroadcaster) {
    let next_level = undefined;
    let selection_mode = settings.level_selection[selection_iter++];
    if (selection_iter >= settings.level_selection.length) {
      selection_iter = 0;
    }
    switch (selection_mode) {
      case 'next':
        next_level = await quesoqueue.next();
        break;
      case 'subnext':
        next_level = await quesoqueue.subnext();
        break;
      case 'modnext':
        next_level = await quesoqueue.modnext();
        break;
      case 'random':
        next_level = await quesoqueue.random();
        break;
      case 'subrandom':
        next_level = await quesoqueue.subrandom();
        break;
      case 'modrandom':
        next_level = await quesoqueue.modrandom();
        break;
      default:
        selection_mode = 'default';
        next_level = await quesoqueue.next();
    }
    level_timer.restart();
    level_timer.pause();
    respond('(' + selection_mode + ') ' + next_level_message(next_level));
  } else if (message == '!next' && sender.isBroadcaster) {
    level_timer.restart();
    level_timer.pause();
    let next_level = await quesoqueue.next();
    respond(next_level_message(next_level));
  } else if (message == '!subnext' && sender.isBroadcaster) {
    level_timer.restart();
    level_timer.pause();
    let next_level = await quesoqueue.subnext();
    respond(next_level_message(next_level));
  } else if (message == '!modnext' && sender.isBroadcaster) {
    level_timer.restart();
    level_timer.pause();
    let next_level = await quesoqueue.modnext();
    respond(next_level_message(next_level));
  } else if (message == '!random' && sender.isBroadcaster) {
    level_timer.restart();
    level_timer.pause();
    let next_level = await quesoqueue.random();
    respond(next_level_message(next_level));
  } else if (message == '!subrandom' && sender.isBroadcaster) {
    level_timer.restart();
    level_timer.pause();
    let next_level = await quesoqueue.subrandom();
    respond(next_level_message(next_level));
  } else if (message == '!modrandom' && sender.isBroadcaster) {
    level_timer.restart();
    level_timer.pause();
    let next_level = await quesoqueue.modrandom();
    respond(next_level_message(next_level));
  } else if (message == '!punt' && sender.isBroadcaster) {
    level_timer.restart();
    level_timer.pause();
    respond(await quesoqueue.punt());
  } else if ((message == '!dismiss' || message == '!skip' || message.startsWith('!complete')) && sender.isBroadcaster) {
    level_timer.restart();
    level_timer.pause();
    respond(await quesoqueue.dismiss());
  } else if (message.startsWith('!dip') && sender.isBroadcaster) {
    var username = get_remainder(message);
    level_timer.restart();
    level_timer.pause();
    var dip_level = quesoqueue.dip(username);
    if (dip_level !== undefined) {
      respond(
        dip_level.submitter +
        "'s level " +
        dip_level.code +
        ' has been pulled up from the queue.'
      );
    } else {
      respond('No levels in the queue were submitted by ' + username);
    }
  } else if (message == '!current') {
    respond(current_level_message(quesoqueue.current()));
  } else if (message.startsWith('!list') || message.startsWith('!queue')) {
    if (can_list) {
      can_list = false;
      setTimeout(() => can_list = true, settings.message_cooldown * 1000);
      respond(level_list_message(sender.displayName, quesoqueue.current(), await quesoqueue.list()));
    } else {
      respond('Just...scroll up a little');
    }
  } else if (message == '!position') {
    respond(await position_message(await quesoqueue.position(sender.displayName), sender.displayName));
  } else if (message == '!start' && sender.isBroadcaster) {
    level_timer.resume();
    respond('Timer started! Get going!');
  } else if (message == '!resume' && sender.isBroadcaster) {
    level_timer.resume();
    respond('Timer unpaused! Get going!');
  } else if (message == '!pause' && sender.isBroadcaster) {
    level_timer.pause();
    respond('Timer paused');
  } else if (message == '!restart' && sender.isBroadcaster) {
    level_timer.restart();
    respond('Starting the clock over! CP Hype!');
  } else if (message == '!restore' && sender.isBroadcaster) {
    quesoqueue.load();
    respond(level_list_message(quesoqueue.current(), await quesoqueue.list()));
  } else if (message == '!clear' && sender.isBroadcaster) {
    quesoqueue.clear();
    respond('Queue cleared! A fresh start.');
  } else if (message == '!lurk') {
    twitch.setToLurk(sender.username);
    respond(sender.displayName + ', your level will not be played until you use the !back command.');
  } else if (message == '!back') {
    if (twitch.notLurkingAnymore(sender.username)) {
      respond('Welcome back ' + sender.displayName + '!');
    }
  } else if (message == '!order') {
    if (settings.level_selection.length == 0) {
      respond('No order has been specified.');
    } else {
      respond('Level order: ' +
        settings.level_selection.reduce((acc, x) => acc + ', ' + x) +
        '. Next level will be: ' +
        settings.level_selection[selection_iter % settings.level_selection.length]);
    }
  }
}

// Set up the chatbot helper and connect to the Twitch channel.
const chatbot_helper = chatbot.helper(
  settings.username,
  settings.password,
  settings.channel
);
chatbot_helper.setup(HandleMessage);
chatbot_helper.connect();
