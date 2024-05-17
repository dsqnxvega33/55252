const { EmbedBuilder, GatewayDispatchEvents } = require("discord.js");
const { Cluster } = require("lavaclient");
const prettyMs = require("pretty-ms");
require("@lavaclient/plugin-queue");

/**
 * @param {import("@structures/BotClient")} client
 */
module.exports = (client) => {

  const lavaclient = new Cluster({
    nodes: client.config.MUSIC.LAVALINK_NODES.map(node => ({
      ...node,
      info: {
        host: node.host,
        port: node.port,
        auth: node.auth,
      },
      ws: {
        clientName: "Strange",
        resuming: true,
        reconnecting: {
          tries: Infinity,
          delay: (attempt) => attempt * 1000
        }
      }
    })),
    discord: {
      sendGatewayCommand: (id, payload) => client.guilds.cache.get(id)?.shard?.send(payload),
    },
  });

  client.ws.on(GatewayDispatchEvents.VoiceStateUpdate, (data) => lavaclient.players.handleVoiceUpdate(data));
  client.ws.on(GatewayDispatchEvents.VoiceServerUpdate, (data) => lavaclient.players.handleVoiceUpdate(data));

  lavaclient.on("nodeConnected", (node, event) => {
    client.logger.log(`Node "${node.identifier}" connected`);
  });

  lavaclient.on("nodeDisconnected", (node, event) => {
    client.logger.log(`Node "${node.identifier}" disconnected`);
  });

  lavaclient.on("nodeError", (node, error) => {
    client.logger.error(`Node "${node.identifier}" encountered an error: ${error.message}.`, error);
  });

  lavaclient.on("nodeTrackStart", async (_node, queue, track) => {
    const fields = [];
    const songTitle = track.info.title.substring(0, 19);
    
    const embed = new EmbedBuilder()
      .setAuthor({ name: "Now Playing" })
      .setColor(client.config.EMBED_COLORS.BOT_EMBED)
      .setDescription(`[${songTitle}](${track.info.uri})`)
      .setFooter({ text: `Requested By: ${queue.player.userData?.requesterId}` })
      .setThumbnail(track.info.artworkUrl);

    fields.push({
      name: "Song Duration",
      value: "`" + prettyMs(track.info.length, { colonNotation: true }) + "`",
      inline: true,
    });

    if (queue.tracks.length > 0) {
      fields.push({
        name: "Position in Queue",
        value: (queue.tracks.length + 1).toString(),
        inline: true,
      });
    }

    embed.setFields(fields);
    queue.data.channel.safeSend({ embeds: [embed] });
  });

  lavaclient.on("nodeQueueFinish", async (_node, queue) => {
    queue.data.channel.safeSend("Queue has ended.");
     await client.musicManager.players.destroy(queue.player.guildId).then(() => queue.player.voice.disconnect());
  });

  return lavaclient;
};
