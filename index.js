require('dotenv').config();

const http = require('http');
http.createServer((req, res) => {
    res.write("¡Bot completamente despierto!");
    res.end();
}).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Forzamos la lectura de la clave
const MI_CLAVE_SECRETA = process.env.GEMINI_API_KEY || "AQ.Ab8RN6K1KPYE-OjxneEgSrv4MVKwdxH_JfAbnq5fREOg12PKmg";

const ai = new GoogleGenerativeAI(MI_CLAVE_SECRETA);
// Cambiado a gemini-1.5-flash: Máxima velocidad y capacidad para preguntas difíciles
const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

client.once('ready', async () => {
    console.log(`🤖 ¡Bot conectado con éxito como ${client.user.tag}!`);
    const askCommand = new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Hazle una pregunta a la Inteligencia Artificial')
        .addStringOption(option => option.setName('pregunta').setDescription('Tu pregunta para la IA').setRequired(true));
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
            const resultado = await model.generateContent(preguntaUsuario);
            const respuestaIA = resultado.response.text();
            
            // Recortamos por si supera el límite estricto de Discord (2000 caracteres)
            const mensajeFinal = respuestaIA.length > 1990 ? respuestaIA.substring(0, 1990) + "..." : respuestaIA;
            
            // Envía única y exclusivamente la respuesta directa de la IA
            await interaction.editReply(mensajeFinal);
        } catch (error) {
            console.error("❌ Error de Gemini:", error);
            try {
                await interaction.editReply('❌ Hubo un error al procesar tu pregunta.');
            } catch (e) {}
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
