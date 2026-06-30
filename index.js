require('dotenv').config();

// PARCHE PARA EVITAR QUE RENDER TUMBE EL BOT GRATUITO
const http = require('http');
http.createServer((req, res) => {
    res.write("¡Bot en línea!");
    res.end();
}).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// IMPORTANTE: Añadimos MessageContent para que el bot pueda leer el chat
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent 
    ]
});

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = ai.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    systemInstruction: "Eres un asistente de IA inteligente y divertido metido en un bot de Discord."
});

client.once('ready', () => {
    console.log(`🤖 ¡Bot conectado con éxito como ${client.user.tag}!`);
    console.log('💡 Ahora el bot responderá cuando escribas: !ask [tu pregunta]');
});

// Escuchamos los mensajes del chat
client.on('messageCreate', async (message) => {
    // Ignoramos los mensajes de otros bots para evitar bucles
    if (message.author.bot) return;

    // Comprobamos si el mensaje empieza por !ask
    if (message.content.startsWith('!ask ')) {
        const preguntaUsuario = message.content.slice(5).trim(); // Quitamos el "!ask "

        if (!preguntaUsuario) {
            return message.reply('¡Dime qué quieres preguntarle a la IA! Ejemplo: `!ask hola`');
        }

        try {
            // Ponemos el estado de "Escribiendo..." en Discord para avisar que está pensando
            await message.channel.sendTyping();

            // Llamamos a Gemini
            const resultado = await model.generateContent(preguntaUsuario);
            const respuestaIA = resultado.response.text();

            // Respondemos directamente al mensaje del usuario
            await message.reply(`🤖 **Respuesta:** ${respuestaIA}`);

        } catch (error) {
            console.error("Error directo de Gemini:", error);
            await message.reply('❌ Hubo un error al intentar obtener respuesta de la IA. Comprueba los logs.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
