console.log('index.js start');
require('dotenv').config();
console.log('dotenv loaded');

const token = process.env.TOKEN;
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');

// Discordクライアント設定
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ]
});

// コマンドコレクション
client.commands = new Collection();

// コマンド読み込み
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command && 'data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`⚠️ ${file} は正しいコマンド形式じゃない`);
  }
}

// スラッシュコマンド処理
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('❌ エラー:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'An error occurred.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'An error occurred.', ephemeral: true });
    }
  }
});

// プレフィックスコマンド処理（<<）
client.on('messageCreate', async message => {
  const prefix = '<<';
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command || typeof command.executePrefix !== 'function') return;

  try {
    await command.executePrefix(message, args);
  } catch (error) {
    console.error('❌ Prefix command error:', error);
    message.reply('An error occurred while executing the command.');
  }
});

// 起動時処理
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Express Webサーバー（Railwayで常時起動させるため）
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

// Discordログイン
client.login(token);
