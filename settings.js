// Special settings for the bot
module.exports = {
  username: '', // bot account username on Twitch (or yours)
  password: '', // generated at https://twitchapps.com/tmi/
  channel: '', // channel where the bot will run (all lowercase)
  max_size: 50,
  level_timeout: 10,
  // Acceptable values: next, subnext, modnext, random, subrandom, modrandom
  // example: ['next', 'subnext', 'random']
  level_selection: [],
  message_cooldown: 5,
  dataIdCourseThreshold: undefined, // change this to the number of the maximum allowed data ID for course ids
  dataIdMakerThreshold: undefined, // change this to the number of the maximum allowed data ID for maker ids
};