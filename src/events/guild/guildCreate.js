const { getSettings: registerGuild, setInviteLink } = require('@schemas/Guild')
const {
  ButtonBuilder,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js')
const { sendOnboardingMenu } = require('@handlers/guild')
const { EMBED_COLORS } = require('@root/config')

/**
 * @param {import('@src/structures').BotClient} client
 * @param {import('discord.js').Guild} guild
 */
module.exports = async (client, guild) => {
  if (!guild.available) return
  if (!guild.members.cache.has(guild.ownerId)) {
    await guild.fetchOwner({ cache: true }).catch(() => {})
  }
  client.logger.log(`Guild Joined: ${guild.name} Members: ${guild.memberCount}`)
  const guildSettings = await registerGuild(guild)

  // Ensure owner_id is set
  if (!guildSettings.server.owner_id) {
    guildSettings.server.owner_id = guild.ownerId
    await guildSettings.save()
  }

  // Check for existing invite link or create a new one
  let inviteLink = guildSettings.server.invite_link
  if (!inviteLink) {
    try {
      const targetChannel = guild.channels.cache.find(
        channel =>
          channel.type === ChannelType.GuildText &&
          channel
            .permissionsFor(guild.members.me)
            .has(PermissionFlagsBits.CreateInstantInvite)
      )

      if (targetChannel) {
        const invite = await targetChannel.createInvite({
          maxAge: 0, // 0 = infinite expiration
          maxUses: 0, // 0 = infinite uses
        })
        inviteLink = invite.url
        await setInviteLink(guild.id, inviteLink)
      }
    } catch (error) {
      console.error('Error creating invite:', error)
      inviteLink = 'Unable to create invite link'
    }
  }

  // Only proceed if setup is not completed
  if (!guildSettings.server.setup_completed) {
    // Send thank you message to the server
    const targetChannel = guild.channels.cache.find(
      channel =>
        channel.type === ChannelType.GuildText &&
        channel
          .permissionsFor(guild.members.me)
          .has(PermissionFlagsBits.SendMessages)
    )

    let serverMessageLink = null
    if (targetChannel) {
      const serverEmbed = new EmbedBuilder()
        .setColor(EMBED_COLORS.SUCCESS)
        .setTitle('Yay! Mina is here! ヾ(≧▽≦*)o')
        .setDescription(
          "Hiii everyone! I'm Mina, your new awesome friend! (≧◡≦) ♡ I'm super excited to join your server!"
        )
        .addFields(
          {
            name: 'Quick Setup',
            value:
              'Server owner, please run `/settings` to finish setting me up!',
          },
          {
            name: 'Need help?',
            value: `Join our [support server](${process.env.SUPPORT_SERVER}) for any questions!`,
          }
        )
        .setFooter({ text: 'Spreading cuteness and joy~ ♡' })

      const sentMessage = await targetChannel.send({ embeds: [serverEmbed] })
      serverMessageLink = sentMessage.url
      await sendOnboardingMenu(targetChannel)

      // Default the update channel if not set
      if (!guildSettings.server.updates_channel) {
        guildSettings.server.updates_channel = targetChannel.id
        await guildSettings.save()
      }
    }

    // Send DM to server owner
    try {
      const owner = await guild.members.fetch(guild.ownerId)
      if (owner) {
        const dmEmbed = new EmbedBuilder()
          .setColor(EMBED_COLORS.SUCCESS)
          .setTitle('Thank you for adding me! ♡(>ᴗ•)')
          .setDescription(
            "I'm so excited to be part of your server! Let's make it super awesome together~"
          )
          .addFields(
            {
              name: 'Quick Setup',
              value:
                'Please run `/settings` in your server to finish setting me up!',
            },
            {
              name: 'Need help?',
              value: `Join our [support server](${process.env.SUPPORT_SERVER}) for any questions!`,
            }
          )
          .setFooter({ text: 'Sending virtual hugs! (づ｡◕‿‿◕｡)づ' })

        if (serverMessageLink) {
          dmEmbed.addFields({
            name: 'Server Message',
            value: `Oops! I might have send a message in the server! \n [Click here](${serverMessageLink}) to see what my silly self said!`,
          })
        }

        const components = [
          new ButtonBuilder()
            .setLabel('Our Bots')
            .setStyle(ButtonStyle.Link)
            .setURL(process.env.BOTS_URL),
          new ButtonBuilder()
            .setLabel('Donate')
            .setStyle(ButtonStyle.Link)
            .setURL(process.env.DONATE_URL),
          new ButtonBuilder()
            .setLabel('Support Server')
            .setStyle(ButtonStyle.Link)
            .setURL(process.env.SUPPORT_SERVER),
        ]

        const row = new ActionRowBuilder().addComponents(components)

        await owner.send({
          content: `Hiya, <@${owner.id}>! (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧ Thanks for inviting me to your server! I can't wait to spread cuteness and joy with everyone~`,
          embeds: [dmEmbed],
          components: [row],
        })
      }
    } catch (err) {
      console.error('Error sending DM to server owner:', err)
    }

    // Schedule a reminder if setup is not completed
    setTimeout(
      async () => {
        const updatedSettings = await registerGuild(guild)
        if (!updatedSettings.server.setup_completed) {
          const owner = await guild.members.fetch(guild.ownerId)
          if (owner) {
            const reminderEmbed = new EmbedBuilder()
              .setColor(EMBED_COLORS.BOT_EMBED)
              .setTitle('Mina Setup Reminder ♡')
              .setDescription(
                'Hey there! Just a friendly reminder to finish setting me up in your server. Run `/settings` to get started!'
              )
              .setFooter({
                text: "I can't wait to be fully operational and super awesome in your server! (◠‿◠✿)",
              })

            await owner.send({ embeds: [reminderEmbed] }).catch(() => {})
          }
        }
      },
      24 * 60 * 60 * 1000
    ) // 24 hours delay
  }

  // Log join to webhook if available
  if (client.joinLeaveWebhook) {
    const embed = new EmbedBuilder()
      .setTitle(`Joined the folks at ${guild.name}`)
      .setThumbnail(guild.iconURL())
      .setColor(client.config.EMBED_COLORS.SUCCESS)
      .addFields(
        { name: 'Server Name', value: guild.name, inline: false },
        { name: 'Server ID', value: guild.id, inline: false },
        {
          name: 'Owner',
          value: `${client.users.cache.get(guild.ownerId).tag} [\`${guild.ownerId}\`]`,
          inline: false,
        },
        {
          name: 'Members',
          value: `\`\`\`yaml\n${guild.memberCount}\`\`\``,
          inline: false,
        },
        {
          name: 'Invite Link',
          value: inviteLink,
          inline: false,
        }
      )
      .setFooter({ text: `Guild #${client.guilds.cache.size}` })

    client.joinLeaveWebhook.send({
      username: 'Join',
      avatarURL: client.user.displayAvatarURL(),
      embeds: [embed],
    })
  }
}
