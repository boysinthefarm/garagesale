const functions = require('firebase-functions');
const { WebClient } = require('@slack/web-api');
const { getMrkdwnBlock, askPermissionBlock } = require('./block-kits');
const { generateInstallUrl } = require('./slack-installer');

const webClientBot = new WebClient(functions.config().slack.token);

function postMessageSellInstruction(event) {
  return webClientBot.chat.postMessage({
    channel: event.user,
    blocks: [getMrkdwnBlock(
      'Send a message here with an image attachment to start selling!',
      { block_id: `sell_instruction_${Date.now()}` },
    )],
  });
};

// send a message to app "Messages" tab to ask user to give us permission
async function postMessageRequestPermission(event) {
  return webClientBot.chat.postMessage({
    channel: event.user,
    blocks: askPermissionBlock(await generateInstallUrl()),
  });
};

module.exports = {
  postMessageSellInstruction,
  postMessageRequestPermission,
};

