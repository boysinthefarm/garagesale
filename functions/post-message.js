const { webClientBot } = require('./utils');
const { getMrkdwnBlock } = require('./block-kits');

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
    blocks: await askPermissionBlock(),
  });
};

module.exports = {
  postMessageSellInstruction,
  postMessageRequestPermission,
};

