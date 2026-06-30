require('dotenv').config();

const http = require('http');
http.createServer((req, res) => {
    res.write("¡Bot en línea!");
    res.end();
}).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Aseguramos la clave secreta
const MI_CLAVE_SECRETA = process.env.GEMINI_API_KEY || "AQ.Ab8RN6K1KPYE-OjxneEgSrv4MVKwdxH_JfAbnq5fREOg12PKmg";
const ai = new GoogleGenerativeAI(MI_CLAVE_SECRETA);

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
            await interaction.deferReply(); 
        } catch (err) {
            return;
        }

        const preguntaUsuario = interaction.options.getString('pregunta');

        try {
            // Inicialización limpia compatible con los modelos 1.5 y superiores
            const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            const resultado = await model.generateContent(preguntaUsuario);
            const respuestaIA = resultado.response.text();
            
            // Si la respuesta es gigantesca, la recortamos para que Discord no la tumbe
            const mensajeFinal = respuestaIA.length > 1990 ? respuestaIA.substring(0, 1990) + "..." : respuestaIA;
            
            // Enviamos ÚNICA Y EXCLUSIVAMENTE el texto directo de la IA
            await interaction.editReply(mensajeFinal);
        } catch (error) {
            console.error("❌ Error interno de ejecución:", error);
            try {
                await interaction.editReply('❌ No se pudo procesar la pregunta con el motor 1.5. Verifica tu código.');
            } catch (e) {}
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
