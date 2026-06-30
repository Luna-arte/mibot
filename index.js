require('dotenv').config();

// PARCHE PARA EVITAR QUE RENDER TUMBE EL BOT GRATUITO
const http = require('http');
http.createServer((req, res) => {
    res.write("¡Bot en línea!");
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

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = ai.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    systemInstruction: "Eres un asistente de IA inteligente y divertido metido en un comando de Discord."
});

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
        console.log('✅ ¡Comando /ask registrado con éxito globalmente!');
    } catch (error) {
        console.error('Error al registrar el comando:', error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ask') {
        // 1. LE DECIMOS A DISCORD INMEDIATAMENTE QUE ESPERE (EVITA EL ERROR 10062)
        try {
            await interaction.deferReply();
        } catch (err) {
            console.error("Error al hacer defer:", err);
            return;
        }

        const preguntaUsuario = interaction.options.getString('pregunta');

        try {
            // 2. LLAMAMOS A GEMINI SIN PRISA
            const resultado = await model.generateContent(preguntaUsuario);
            const respuestaIA = resultado.response.text();

            // 3. EDITAMOS LA RESPUESTA CUANDO ESTÉ LISTA
            await interaction.editReply(`**Pregunta:** ${preguntaUsuario}\n\n🤖 **Respuesta:** ${respuestaIA}`);

        } catch (error) {
            console.error("Error directo de Gemini:", error);
            try {
                await interaction.editReply('❌ Hubo un error al intentar obtener respuesta de la IA. Verifica tu API Key.');
            } catch (e) {
                console.error("No se pudo enviar el mensaje de error final:", e);
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
