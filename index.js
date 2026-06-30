require('dotenv').config();

const http = require('http');
// Servidor web básico para mantener vivo el bot en Render
http.createServer((req, res) => {
    res.write("Bot Activo");
    res.end();
}).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Tu API Key de Gemini (se lee desde Render o directamente aquí)
const MI_CLAVE_SECRETA = process.env.GEMINI_API_KEY || "AQ.Ab8RN6K1KPYE-OjxneEgSrv4MVKwdxH_JfAbnq5fREOg12PKmg";

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
            // Evita el error de "La aplicación no ha respondido" de Discord
            await interaction.deferReply(); 
        } catch (err) {
            return;
        }

        const preguntaUsuario = interaction.options.getString('pregunta');

        try {
            // Conexión directa por HTTP a Gemini 1.5 Flash (Súper veloz y avanzado)
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${MI_CLAVE_SECRETA}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: preguntaUsuario }] }]
                })
            });

            const data = await response.json();
            
            // Extraemos el texto limpio de la respuesta de Google
            if (data.candidates && data.candidates[0].content.parts[0].text) {
                const respuestaIA = data.candidates[0].content.parts[0].text;
                
                // Cortamos si pasa el límite de Discord
                const mensajeFinal = respuestaIA.length > 1990 ? respuestaIA.substring(0, 1990) + "..." : respuestaIA;
                
                // Enviar la respuesta directa y limpia sin adornos
                await interaction.editReply(mensajeFinal);
            } else {
                throw new Error("Respuesta inesperada de la API");
            }

        } catch (error) {
            console.error("❌ Error con Fetch Gemini:", error);
            try {
                await interaction.editReply('❌ Hubo un problema al obtener la respuesta de la IA.');
            } catch (e) {}
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
