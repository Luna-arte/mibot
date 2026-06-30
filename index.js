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

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY, {
    baseUrl: "https://generativelanguage.googleapis.com"
});
const model = ai.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    systemInstruction: "Eres un asistente de IA inteligente y divertido metido en un comando de Discord."
});

// Registrar el comando /ask de forma limpia
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
        console.log('⏳ Registrando comando /ask...');
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: [askCommand.toJSON()] }
        );

        console.log('✅ ¡Comando /ask registrado globalmente con éxito!');
    } catch (error) {
        console.error('Error al registrar el comando:', error);
    }
});

// Escuchar el comando /ask real de Discord
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ask') {
        
        // ¡OJO AQUÍ! Le decimos a Discord INSTANTÁNEAMENTE que espere. 
        // Esto frena los 3 segundos de límite y evita que salga "La aplicación no respondió".
        await interaction.deferReply(); 

        const preguntaUsuario = interaction.options.getString('pregunta');

        try {
            // Ahora la IA puede tardar lo que quiera (Render tiene tiempo para despertar)
            const resultado = await model.generateContent(preguntaUsuario);
            const respuestaIA = resultado.response.text();

            // Enviamos la respuesta real sustituyendo el mensaje de espera
            await interaction.editReply(`**Pregunta:** ${preguntaUsuario}\n\n🤖 **Respuesta:** ${respuestaIA}`);

        } catch (error) {
            console.error("Error directo de Gemini:", error);
            await interaction.editReply('❌ Hubo un error al intentar hablar con Gemini. Verifica tu API Key.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
