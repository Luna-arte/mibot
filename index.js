require('dotenv').config();

// PARCHE PARA EVITAR QUE RENDER TUMBE EL BOT GRATUITO
const http = require('http');
http.createServer((req, res) => {
    res.write("¡Bot en línea!");
    res.end();
}).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configuramos el bot de Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Conectamos con la IA de Google Gemini (Forma más compatible)
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = ai.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    systemInstruction: "Eres un asistente de IA inteligente y divertido metido en un comando de Discord."
});

// Esto creará el comando /ask automáticamente cuando el bot se encienda
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
        console.log('⏳ Registrando el comando /ask en Discord...');
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

// Escuchamos cuando alguien usa el comando /ask
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ask') {
        const preguntaUsuario = interaction.options.getString('pregunta');

        try {
            // Le decimos a Discord que espere porque la IA tarda unos segundos
            await interaction.deferReply();

            // Llamamos a Gemini
            const resultado = await model.generateContent(preguntaUsuario);
            const respuestaIA = resultado.response.text();

            // Enviamos la respuesta de vuelta a Discord
            await interaction.editReply(`**Pregunta:** ${preguntaUsuario}\n\n🤖 **Respuesta:** ${respuestaIA}`);

        } catch (error) {
            console.error("Error directo de Gemini:", error);
            await interaction.editReply('❌ Hubo un error al intentar comunicarme con la IA.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
