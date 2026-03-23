// ============================================
// OnCall Maestro — Discord Integration
// ============================================
// Replaces Slack. Handles DMs, channel alerts,
// and slash command interactions via Discord.js.

import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  TextChannel,
  SlashCommandBuilder,
  REST,
  Routes,
  ChatInputCommandInteraction,
  Events,
  Colors,
} from "discord.js";
import { env } from "../config/env.js";
import { prisma } from "../config/database.js";
import { setAckState } from "../services/dedup.js";
import { logger } from "../utils/logger.js";

const log = logger.child({ component: "discord" });

let discordClient: Client | null = null;

// ── Severity → color mapping ────────────────────
const SEVERITY_COLORS: Record<string, number> = {
  P1: Colors.Red,
  P2: Colors.Orange,
  P3: Colors.Yellow,
  P4: Colors.Blue,
};

// ── Create & connect Discord client ─────────────
export async function initDiscord(): Promise<Client | null> {
  if (!env.DISCORD_BOT_TOKEN) {
    log.warn("DISCORD_BOT_TOKEN not set — Discord integration disabled");
    return null;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
    ],
  });

  client.once(Events.ClientReady, (readyClient) => {
    log.info({ user: readyClient.user.tag }, "Discord bot connected");
  });

  // Register slash commands
  await registerSlashCommands();

  // Handle slash command interactions
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    try {
      await handleSlashCommand(interaction);
    } catch (err) {
      log.error({ err, command: interaction.commandName }, "Slash command error");
      const replyFn = interaction.replied || interaction.deferred
        ? interaction.followUp.bind(interaction)
        : interaction.reply.bind(interaction);
      await replyFn({ content: "❌ An error occurred.", ephemeral: true });
    }
  });

  await client.login(env.DISCORD_BOT_TOKEN);
  discordClient = client;
  return client;
}

export function getDiscordClient(): Client | null {
  return discordClient;
}

// ── Register Slash Commands ─────────────────────
async function registerSlashCommands(): Promise<void> {
  if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_CLIENT_ID) return;

  const commands = [
    new SlashCommandBuilder()
      .setName("ack")
      .setDescription("Acknowledge an incident")
      .addStringOption((opt) =>
        opt.setName("incident_id").setDescription("The incident ID").setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("resolve")
      .setDescription("Resolve an incident")
      .addStringOption((opt) =>
        opt.setName("incident_id").setDescription("The incident ID").setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName("notes").setDescription("Resolution notes").setRequired(false)
      ),
    new SlashCommandBuilder()
      .setName("oncall")
      .setDescription("Show who is currently on call"),
    new SlashCommandBuilder()
      .setName("incidents")
      .setDescription("List open incidents"),
    new SlashCommandBuilder()
      .setName("briefing")
      .setDescription("Request a handover briefing regeneration"),
    new SlashCommandBuilder()
      .setName("swap")
      .setDescription("Request a rota swap with another engineer")
      .addUserOption((opt) =>
        opt.setName("engineer").setDescription("The engineer to swap with").setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName("shift_date").setDescription("Shift date (YYYY-MM-DD), defaults to your next shift").setRequired(false)
      ),
    new SlashCommandBuilder()
      .setName("available")
      .setDescription("Set your availability (mark yourself unavailable)")
      .addStringOption((opt) =>
        opt.setName("from").setDescription("Unavailable from (YYYY-MM-DD)").setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName("to").setDescription("Unavailable to (YYYY-MM-DD)").setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName("reason").setDescription("Reason (holiday, sick, travel, personal)").setRequired(false)
      ),
  ];

  const rest = new REST({ version: "10" }).setToken(env.DISCORD_BOT_TOKEN);

  try {
    if (env.DISCORD_GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID),
        { body: commands.map((c) => c.toJSON()) }
      );
    } else {
      await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), {
        body: commands.map((c) => c.toJSON()),
      });
    }
    log.info("Discord slash commands registered");
  } catch (err) {
    log.error({ err }, "Failed to register Discord slash commands");
  }
}

// ── Handle Slash Commands ───────────────────────
async function handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const { commandName } = interaction;

  switch (commandName) {
    case "ack": {
      const incidentId = interaction.options.getString("incident_id", true);
      const engineer = await prisma.engineer.findFirst({
        where: { discordUserId: interaction.user.id },
      });
      if (!engineer) {
        await interaction.reply({ content: "❌ Your Discord account is not linked to an engineer profile.", ephemeral: true });
        return;
      }
      const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
      if (!incident) {
        await interaction.reply({ content: `❌ Incident \`${incidentId}\` not found.`, ephemeral: true });
        return;
      }
      if (incident.status === "acknowledged" || incident.status === "resolved") {
        await interaction.reply({ content: `Already ${incident.status}.`, ephemeral: true });
        return;
      }
      await setAckState(incidentId, engineer.id);
      await prisma.incident.update({
        where: { id: incidentId },
        data: { status: "acknowledged", acknowledgedAt: new Date(), assigneeId: engineer.id },
      });
      await prisma.auditLog.create({
        data: {
          orgId: engineer.orgId, actorId: engineer.id, actorType: "engineer",
          action: "incident.acknowledged", entityType: "incident", entityId: incidentId,
          metadata: JSON.stringify({ source: "discord", timeToAckMs: Date.now() - incident.createdAt.getTime() }),
        },
      });
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("✅ Incident Acknowledged")
            .setDescription(`**${incident.title}** acknowledged by ${engineer.name}`)
            .setColor(Colors.Green)
            .addFields(
              { name: "Severity", value: incident.severity, inline: true },
              { name: "Service", value: incident.service, inline: true },
              { name: "Time to ACK", value: `${Math.round((Date.now() - incident.createdAt.getTime()) / 1000)}s`, inline: true }
            )
            .setTimestamp(),
        ],
      });
      break;
    }

    case "resolve": {
      const incidentId = interaction.options.getString("incident_id", true);
      const notes = interaction.options.getString("notes") || undefined;
      const engineer = await prisma.engineer.findFirst({
        where: { discordUserId: interaction.user.id },
      });
      if (!engineer) {
        await interaction.reply({ content: "❌ Your Discord account is not linked.", ephemeral: true });
        return;
      }
      const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
      if (!incident) {
        await interaction.reply({ content: `❌ Incident \`${incidentId}\` not found.`, ephemeral: true });
        return;
      }
      await prisma.incident.update({
        where: { id: incidentId },
        data: { status: "resolved", resolvedAt: new Date(), resolutionNotes: notes, assigneeId: engineer.id },
      });
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("✅ Incident Resolved")
            .setDescription(`**${incident.title}** resolved by ${engineer.name}`)
            .setColor(Colors.Green)
            .addFields(
              { name: "Resolution Notes", value: notes || "None provided" },
              { name: "MTTR", value: `${Math.round((Date.now() - incident.createdAt.getTime()) / 60000)} min` }
            )
            .setTimestamp(),
        ],
      });
      break;
    }

    case "oncall": {
      const now = new Date();
      const activeShifts = await prisma.rota.findMany({
        where: { startTime: { lte: now }, endTime: { gte: now }, status: { in: ["scheduled", "active"] } },
        include: { engineer: true, team: true },
      });
      if (activeShifts.length === 0) {
        await interaction.reply({ content: "No one is currently on call." });
        return;
      }
      const embed = new EmbedBuilder()
        .setTitle("🟢 Currently On Call")
        .setColor(Colors.Green)
        .setTimestamp();
      for (const shift of activeShifts) {
        embed.addFields({
          name: shift.team.name,
          value: `**${shift.engineer.name}** (${shift.shiftType}) — until <t:${Math.floor(shift.endTime.getTime() / 1000)}:R>`,
        });
      }
      await interaction.reply({ embeds: [embed] });
      break;
    }

    case "incidents": {
      const openIncidents = await prisma.incident.findMany({
        where: { status: { in: ["open", "acknowledged"] } },
        include: { assignee: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
      if (openIncidents.length === 0) {
        await interaction.reply({ content: "🎉 No open incidents!" });
        return;
      }
      const embed = new EmbedBuilder()
        .setTitle(`🚨 Open Incidents (${openIncidents.length})`)
        .setColor(Colors.Red)
        .setTimestamp();
      for (const inc of openIncidents) {
        embed.addFields({
          name: `[${inc.severity}] ${inc.title}`,
          value: `Service: ${inc.service} | Status: ${inc.status} | Assignee: ${inc.assignee?.name || "Unassigned"}\nID: \`${inc.id}\``,
        });
      }
      await interaction.reply({ embeds: [embed] });
      break;
    }

    case "briefing": {
      await interaction.reply({ content: "🔄 Regenerating briefing... (this feature requires Phase 3 workers)" });
      break;
    }

    case "swap": {
      const targetUser = interaction.options.getUser("engineer", true);
      const shiftDate = interaction.options.getString("shift_date");

      // Find requesting engineer
      const requestingEng = await prisma.engineer.findFirst({
        where: { discordUserId: interaction.user.id },
      });
      if (!requestingEng) {
        await interaction.reply({ content: "❌ Your Discord account is not linked to an engineer profile.", ephemeral: true });
        return;
      }

      // Find target engineer
      const targetEng = await prisma.engineer.findFirst({
        where: { discordUserId: targetUser.id },
      });
      if (!targetEng) {
        await interaction.reply({ content: `❌ ${targetUser.username} is not linked to an engineer profile.`, ephemeral: true });
        return;
      }

      // Find requesting engineer's upcoming shift
      const now = new Date();
      const shiftWhere: any = {
        engineerId: requestingEng.id,
        status: { in: ["scheduled", "active"] },
      };
      if (shiftDate) {
        const date = new Date(shiftDate);
        shiftWhere.startTime = { gte: date };
        shiftWhere.endTime = { lte: new Date(date.getTime() + 24 * 60 * 60 * 1000) };
      } else {
        shiftWhere.startTime = { gte: now };
      }

      const shift = await prisma.rota.findFirst({
        where: shiftWhere,
        orderBy: { startTime: "asc" },
        include: { team: true },
      });

      if (!shift) {
        await interaction.reply({ content: "❌ No upcoming shift found.", ephemeral: true });
        return;
      }

      // Check availability conflict
      const conflict = await prisma.availability.findFirst({
        where: {
          engineerId: targetEng.id,
          unavailableFrom: { lte: shift.endTime },
          unavailableTo: { gte: shift.startTime },
          approved: true,
        },
      });

      if (conflict) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Swap Rejected — Conflict")
              .setDescription(`${targetEng.name} is unavailable during that shift (${conflict.reason || "no reason"}).`)
              .setColor(Colors.Red)
              .setTimestamp(),
          ],
          ephemeral: true,
        });
        return;
      }

      // Perform swap
      await prisma.rota.update({
        where: { id: shift.id },
        data: {
          engineerId: targetEng.id,
          generatedBy: "swap",
          status: "swapped",
          notes: `Swapped from ${requestingEng.name} to ${targetEng.name} via Discord`,
        },
      });

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("🔄 Shift Swap Completed")
            .setColor(Colors.Green)
            .addFields(
              { name: "Team", value: shift.team.name, inline: true },
              { name: "From", value: requestingEng.name, inline: true },
              { name: "To", value: targetEng.name, inline: true },
              { name: "Shift", value: `<t:${Math.floor(shift.startTime.getTime() / 1000)}:f> → <t:${Math.floor(shift.endTime.getTime() / 1000)}:f>` },
            )
            .setTimestamp(),
        ],
      });
      break;
    }

    case "available": {
      const fromStr = interaction.options.getString("from", true);
      const toStr = interaction.options.getString("to", true);
      const reason = interaction.options.getString("reason") || undefined;

      const eng = await prisma.engineer.findFirst({
        where: { discordUserId: interaction.user.id },
      });
      if (!eng) {
        await interaction.reply({ content: "❌ Your Discord account is not linked.", ephemeral: true });
        return;
      }

      const from = new Date(fromStr);
      const to = new Date(toStr);
      if (isNaN(from.getTime()) || isNaN(to.getTime()) || to <= from) {
        await interaction.reply({ content: "❌ Invalid dates. Use YYYY-MM-DD format.", ephemeral: true });
        return;
      }

      await prisma.availability.create({
        data: {
          engineerId: eng.id,
          unavailableFrom: from,
          unavailableTo: to,
          reason: reason || null,
          approved: true,
        },
      });

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("📅 Availability Updated")
            .setDescription(`${eng.name} marked as **unavailable**`)
            .setColor(Colors.Orange)
            .addFields(
              { name: "From", value: `<t:${Math.floor(from.getTime() / 1000)}:D>`, inline: true },
              { name: "To", value: `<t:${Math.floor(to.getTime() / 1000)}:D>`, inline: true },
              { name: "Reason", value: reason || "Not specified", inline: true },
            )
            .setTimestamp(),
        ],
      });
      break;
    }

    default:
      await interaction.reply({ content: "Unknown command.", ephemeral: true });
  }
}

// ── Send alert notification to an engineer via Discord DM ───
export async function sendDiscordDM(
  discordUserId: string,
  incident: { id: string; title: string; severity: string; service: string; description?: string | null }
): Promise<boolean> {
  const client = getDiscordClient();
  if (!client || !discordUserId) return false;

  try {
    const user = await client.users.fetch(discordUserId);
    const dm = await user.createDM();
    await dm.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🚨 [${incident.severity}] ${incident.title}`)
          .setDescription(incident.description || "No description")
          .setColor(SEVERITY_COLORS[incident.severity] || Colors.Grey)
          .addFields(
            { name: "Service", value: incident.service, inline: true },
            { name: "Incident ID", value: `\`${incident.id}\``, inline: true }
          )
          .setFooter({ text: "Reply with /ack <incident_id> to acknowledge" })
          .setTimestamp(),
      ],
    });
    log.info({ discordUserId, incidentId: incident.id }, "Discord DM sent");
    return true;
  } catch (err) {
    log.error({ err, discordUserId }, "Failed to send Discord DM");
    return false;
  }
}

// ── Post alert to a team's Discord channel ──────
export async function sendDiscordChannelAlert(
  channelId: string,
  incident: { id: string; title: string; severity: string; service: string; description?: string | null; assigneeName?: string }
): Promise<boolean> {
  const client = getDiscordClient();
  if (!client || !channelId) return false;

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !(channel instanceof TextChannel)) return false;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🚨 [${incident.severity}] ${incident.title}`)
          .setDescription(incident.description || "No description")
          .setColor(SEVERITY_COLORS[incident.severity] || Colors.Grey)
          .addFields(
            { name: "Service", value: incident.service, inline: true },
            { name: "Assigned To", value: incident.assigneeName || "Routing...", inline: true },
            { name: "Incident ID", value: `\`${incident.id}\`` }
          )
          .setTimestamp(),
      ],
    });
    log.info({ channelId, incidentId: incident.id }, "Discord channel alert sent");
    return true;
  } catch (err) {
    log.error({ err, channelId }, "Failed to post Discord channel alert");
    return false;
  }
}

// ── Send handover briefing via Discord ──────────
export async function sendHandoverBriefing(
  discordUserId: string,
  briefingText: string,
  audioUrl?: string
): Promise<boolean> {
  const client = getDiscordClient();
  if (!client || !discordUserId) return false;

  try {
    const user = await client.users.fetch(discordUserId);
    const dm = await user.createDM();
    const embed = new EmbedBuilder()
      .setTitle("📋 Shift Handover Briefing")
      .setDescription(briefingText)
      .setColor(Colors.Purple)
      .setTimestamp();

    if (audioUrl) {
      embed.addFields({ name: "🔊 Audio Briefing", value: `[Listen here](${audioUrl})` });
    }

    await dm.send({ embeds: [embed] });
    log.info({ discordUserId }, "Handover briefing sent via Discord");
    return true;
  } catch (err) {
    log.error({ err, discordUserId }, "Failed to send handover briefing");
    return false;
  }
}

// ── Shutdown ────────────────────────────────────
export async function disconnectDiscord(): Promise<void> {
  if (discordClient) {
    discordClient.destroy();
    discordClient = null;
    log.info("Discord client disconnected");
  }
}
