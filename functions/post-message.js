const { botClientFactory, generateInstallUrl } = require('./slack-installer');
const { getMrkdwnBlock, askPermissionBlock } = require('./block-kits');
const { logger } = require('./utils');

async function postMessageSellInstruction(auth) {
  const client = await botClientFactory(auth);
  return client.chat.postMessage({
    channel: auth.userId,
    blocks: [getMrkdwnBlock(
      'Send a message here with an image attachment to start selling!',
      { block_id: `sell_instruction_${Date.now()}` },
    )],
  });
};

// send a message to app "Messages" tab to ask user to give us permission
async function postMessageRequestPermission(auth) {
  const client = await botClientFactory(auth);
  logger.log('postMessageRequestPermission', auth);
  return await client.chat.postMessage({
    channel: auth.userId,
    blocks: askPermissionBlock(await generateInstallUrl()),
  });
};

module.exports = {
  postMessageSellInstruction,
  postMessageRequestPermission,
};

