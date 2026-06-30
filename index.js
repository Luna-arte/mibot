require('dotenv').config();

const http = require('http');
http.createServer((req, res) => {
    res.write("¡Bot completamente despierto!");
    res.end();
}).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Inicialización limpia de Gemini
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

client.once('ready', async () => {
    console.log(`🤖 ¡Bot conectado con éxito como ${client.user.tag}!`);
    const askCommand = new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Hazle una pregunta a la Inteligencia Artificial')
        .addStringOption(option => option.setName('pregunta').setDescription('Tu pregunta para la IA').setRequired(true));
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: [askCommand.toJSON()] });
        console.log('✅ Comando de barra registrado de forma global.');
    } catch (e) { console.error("Error al registrar comando:", e); }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ask') {
        try {
            await interaction.deferReply(); 
        } catch (err) {
            console.error("Discord rechazó la interacción por tiempo:", err);
            return;
        }

        const preguntaUsuario = interaction.options.getString('pregunta');

        try {
            const resultado = await model.generateContent(preguntaUsuario);
            const respuestaIA = resultado.response.text();
            
            // Si la respuesta es demasiado larga, la recortamos para cumplir con Discord
            const mensajeFinal = respuestaIA.length > 1900 ? respuestaIA.substring(0, 1900) + "..." : respuestaIA;
            await interaction.editReply(`**Pregunta:** ${preguntaUsuario}\n\n🤖 **Respuesta:** ${mensajeFinal}`);
        } catch (error) {
            // ESTO MOSTRARÁ EL ERROR DETALLADO EN EL RECUADRO NEGRO DE RENDER
            console.error("❌ ERROR DETALLADO DE GEMINI:", error.message || error);
            
            try {
                await interaction.editReply('❌ Hubo un error al conectar con Gemini. Comprueba tu API Key.');
            } catch (e) {}
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
