require('dotenv').config();

const http = require('http');
http.createServer((req, res) => {
    res.write("¡Bot 100% Despierto!");
    res.end();
}).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });


const MI_CLAVE_SECRETA = "AQ.Ab8RN6LH3gn025K45kOMcuoTzny21UaxUl4Z2sKYnrYlS6jSfA";

const ai = new GoogleGenerativeAI(MI_CLAVE_SECRETA);
const model = ai.getGenerativeModel({ model: "gemini-pro" });

client.once('ready', async () => {
    console.log(`🤖 ¡Bot conectado como ${client.user.tag}!`);
    const askCommand = new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Hazle una pregunta a la Inteligencia Artificial')
        .addStringOption(option => option.setName('pregunta').setDescription('Tu pregunta').setRequired(true));
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: [askCommand.toJSON()] });
    } catch (e) { console.error(e); }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ask') {
        try {
            await interaction.deferReply(); 
        } catch (err) {
            console.error("Discord cerró la puerta por tardar más de 3 segundos:", err);
            return;
        }

        const preguntaUsuario = interaction.options.getString('pregunta');

        try {
            const resultado = await model.generateContent(preguntaUsuario);
            const respuestaIA = resultado.response.text();
            await interaction.editReply(`**Pregunta:** ${preguntaUsuario}\n\n🤖 **Respuesta:** ${respuestaIA}`);
        } catch (error) {
            console.error("🔥 ERROR REAL DE GEMINI:", error);
            try {
                await interaction.editReply('❌ Hubo un error al conectar con Gemini. Comprueba tu API Key.');
            } catch (e) {}
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
