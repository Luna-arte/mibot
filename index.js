require('dotenv').config();

// PARCHE PARA EVITAR QUE RENDER TUMBE EL BOT GRATUITO
const http = require('http');
http.createServer((req, res) => {
    res.write("¡Bot en línea y despierto!");
    res.end();
}).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Verificación de seguridad en la consola de Render
if (!process.env.GEMINI_API_KEY) {
    console.error("⚠️ ERROR CRÍTICO: No se encuentra la variable GEMINI_API_KEY en Render.");
}

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
// Usamos el modelo base ultra-compatible
const model = ai.getGenerativeModel({ model: "gemini-pro" });

client.once('ready', async () => {
    console.log(`🤖 ¡Bot conectado como ${client.user.tag}!`);

    const askCommand = new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Hazle una pregunta a la Inteligencia Artificial')
        .addStringOption(option => 
            option.setName('pregunta')
                .setDescription('Lo que le quieres preguntar a la IA')
                .setRequired(true)
        );

    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: [askCommand.toJSON()] }
        );
        console.log('✅ ¡Comando /ask registrado con éxito!');
    } catch (error) {
        console.error('Error al registrar el comando:', error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ask') {
        try {
            await interaction.deferReply(); 
        } catch (error) {
            console.error("Discord canceló la interacción:", error);
            return;
        }

        const preguntaUsuario = interaction.options.getString('pregunta');

        try {
            const resultado = await model.generateContent(preguntaUsuario);
            const respuestaIA = resultado.response.text();

            await interaction.editReply(`**Pregunta:** ${preguntaUsuario}\n\n🤖 **Respuesta:** ${respuestaIA}`);
        } catch (error) {
            // Esto imprimirá el error real de Google exacto en tus Logs de Render
            console.error("🔥 ERROR REAL DE GEMINI:", error);
            
            try {
                await interaction.editReply('❌ Hubo un error al intentar hablar con Gemini. Verifica tu API Key o región.');
            } catch (e) {
                console.error("No se pudo enviar el mensaje de error.");
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
