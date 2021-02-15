const { botClientFactory, generateInstallUrl } = require('./slack-installer');
const { getMrkdwnBlock, askPermissionBlock } = require('./block-kits');

async function postMessageSellInstruction(event) {
  const client = await botClientFactory({ userId: event.user });
  return client.chat.postMessage({
    channel: event.user,
    blocks: [getMrkdwnBlock(
      'Send a message here with an image attachment to start selling!',
      { block_id: `sell_instruction_${Date.now()}` },
    )],
  });
};

// send a message to app "Messages" tab to ask user to give us permission
async function postMessageRequestPermission(event) {
  const client = await botClientFactory({ userId: event.user });
  return client.chat.postMessage({
    channel: event.user,
    blocks: askPermissionBlock(await generateInstallUrl()),
  });
};

module.exports = {
  postMessageSellInstruction,
  postMessageRequestPermission,
};

