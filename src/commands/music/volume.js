const { musicValidations } = require("@helpers/BotUtils");
const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "volume",
  description: "set the music player volume",
  category: "MUSIC",
  validations: musicValidations,
  command: {
    enabled: true,
    usage: "<1-100>",
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "amount",
        description: "Enter a value to set [0 to 100]",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
    ],
  },

  async messageRun(message, args) {
    const amount = args[0];
    const response = await volume(message, amount);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const amount = interaction.options.getInteger("amount");
    const response = await volume(interaction, amount);
    await interaction.followUp(response);
  },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
async function volume({ client, guildId }, volume) {
  const player = client.musicManager.players.resolve(guildId);

  if (!volume) return `> The player volume is \`${player.volume * 100}\`.`;
  if (volume < 1 || volume > 100) return "you need to give me a volume between 1 and 100.";

  // Convert the volume from 1-100 range to 0-1 range
  const adjustedVolume = volume / 100;

  // Set the volume using setFilters
  await player.setFilters("volume", adjustedVolume);
  return `🎶 Music player volume is set to \`${volume}\`.`;
}
