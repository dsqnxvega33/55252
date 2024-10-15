const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js')
const { EMBED_COLORS } = require('@root/config.js')
const { ephemeral } = require('@root/src/structures/BaseContext')

module.exports = {
  name: 'report',
  description:
    'Help Mochi make the community better! Report issues or share your thoughts~',
  category: 'UTILITY',
  slashCommand: {
    ephemeral: true,
    enabled: true,
  },

  async interactionRun(interaction) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.BOT_EMBED)
      .setTitle("Mochi's Report System! 🕵️‍♀️")
      .setDescription(
        'Heya! 💖 Wanna help make me even more awesome? Pick what you want to tell the devs about!'
      )

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('report_select')
        .setPlaceholder('Choose something to report or share~')
        .addOptions([
          {
            label: 'Report a Server',
            value: 'server',
            emoji: '🏠',
          },
          { label: 'Report a User', value: 'user', emoji: '👤' },
          { label: 'Report a Bug', value: 'bug', emoji: '🐞' },
          { label: 'Report a TOD Question', value: 'tod', emoji: '🌶️' },
          {
            label: 'Share Your Amazing Feedback',
            value: 'feedback',
            emoji: '💡',
          },
        ])
    )

    await interaction.editReply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    })

    const filter = i => i.user.id === interaction.user.id
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 30000,
    })

    collector.on('collect', async i => {
      if (i.customId === 'report_select') {
        const selected = i.values[0]
        await showReportModal(i, selected)
      }
    })
  },
}

async function showReportModal(interaction, type) {
  const modal = new ModalBuilder()
    .setCustomId(`report_modal_${type}`)
    .setTitle(
      `${type === 'feedback' ? 'Share Your Thoughts with Mochi!' : `Tell Mochi About This ${type.charAt(0).toUpperCase() + type.slice(1)}!`}`
    )

  const titleInput = new TextInputBuilder()
    .setCustomId('title')
    .setLabel('Give it a catchy title!')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("What's the scoop? 🍦")
    .setRequired(true)

  const descriptionInput = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Spill the tea! ☕')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Tell Mochi all about it~')
    .setRequired(true)

  const firstActionRow = new ActionRowBuilder().addComponents(titleInput)
  const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput)
  modal.addComponents(firstActionRow, secondActionRow)

  if (type === 'server' || type === 'user') {
    const idInput = new TextInputBuilder()
      .setCustomId(`${type}Id`)
      .setLabel(`${type === 'server' ? 'Server' : 'User'}'s Secret Code`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(`Enter the ${type} ID here!`)
      .setRequired(true)
    const thirdActionRow = new ActionRowBuilder().addComponents(idInput)
    modal.addComponents(thirdActionRow)
  } else if (type === 'tod') {
    const questionIdInput = new TextInputBuilder()
      .setCustomId('questionId')
      .setLabel('Which question is it?')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Type the question ID here!')
      .setRequired(true)
    const thirdActionRow = new ActionRowBuilder().addComponents(questionIdInput)
    modal.addComponents(thirdActionRow)
  }

  await interaction.showModal(modal)
}
