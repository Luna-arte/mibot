require('dotenv').config();

const http = require('http');
// Servidor básico para que Render no tumbe el bot
http.createServer((req, res) => {
    res.write("¡Ruby en línea!");
    res.end();
}).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Tu API Key limpia
const MI_CLAVE_SECRETA = process.env.GEMINI_API_KEY || AQ.Ab8RN6K1KPYE-OjxneEgSrv4MVKwdxH_JfAbnq5fREOg12PKmg;

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
            // Le dice a Discord que espere (da un margen de hasta 15 minutos)
            await interaction.deferReply(); 
        } catch (err) {
            console.error("Error al diferir interacción:", err);
            return;
        }

        const preguntaUsuario = interaction.options.getString('pregunta');

        try {
            // URL oficial de Gemini 1.5 Flash por HTTP directo
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${MI_CLAVE_SECRETA}`;
            
            const response = await globalThis.fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: preguntaUsuario }]
                    }]
                })
            });

            const data = await response.json();
            
            // Procesamos la respuesta directa de Google
            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                const respuestaIA = data.candidates[0].content.parts[0].text;
                
                // Cortar texto si pasa los 2000 caracteres de Discord
                const mensajeFinal = respuestaIA.length > 1990 ? respuestaIA.substring(0, 1990) + "..." : respuestaIA;
                
                // Imprime única y exclusivamente la respuesta limpia de la IA
                await interaction.editReply(mensajeFinal);
            } else {
                console.error("Estructura de respuesta inesperada:", JSON.stringify(data));
                throw new Error("No se recibió texto válido de la API");
            }

        } catch (error) {
            console.error("❌ ERROR DETALLADO EN PETICIÓN:", error);
            try {
                await interaction.editReply('❌ Hubo un problema al obtener la respuesta de la IA.');
            } catch (e) {}
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
