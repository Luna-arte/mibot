require('dotenv').config();

const http = require('http');
// Servidor básico para mantener vivo el bot en Render
http.createServer((req, res) => {
    res.write("¡Ruby con ChatGPT activa!");
    res.end();
}).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// PEGA TU API KEY DE OPENAI AQUÍ (La que empieza por sk-...)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "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";

client.once('ready', async () => {
    console.log(`🤖 ¡Bot conectado como ${client.user.tag} usando ChatGPT!`);
    const askCommand = new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Hazle una pregunta a ChatGPT')
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
            return;
        }

        const preguntaUsuario = interaction.options.getString('pregunta');

        try {
            // Petición directa por HTTP a la API de OpenAI (Súper rápido y sin librerías rotas)
            const response = await globalThis.fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini', // Modelo ultra-rápido, inteligente y económico
                    messages: [{ role: 'user', content: preguntaUsuario }]
                })
            });

            const data = await response.json();

            if (data.choices && data.choices[0]?.message?.content) {
                const respuestaIA = data.choices[0].message.content;
                
                // Cortar texto si pasa los 2000 caracteres de Discord
                const mensajeFinal = respuestaIA.length > 1990 ? respuestaIA.substring(0, 1990) + "..." : respuestaIA;
                
                // Muestra solo la respuesta limpia, como querías
                await interaction.editReply(mensajeFinal);
            } else {
                console.error("Error en respuesta de OpenAI:", data);
                throw new Error("Respuesta inválida de OpenAI");
            }

        } catch (error) {
            console.error("❌ Error con OpenAI:", error);
            try {
                await interaction.editReply('❌ Hubo un problema al obtener la respuesta de ChatGPT.');
            } catch (e) {}
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
