require('dotenv').config();
const { Telegraf } = require('telegraf');

// Токен и канал берутся из .env файла
const bot = new Telegraf(process.env.BOT_TOKEN);
const PUBLIC_CHANNEL = process.env.PUBLIC_CHANNEL || '@bigstepacoding';

console.log('Gatekeeper Bot запустился и ждет заявок...');

// Слушаем запросы на вступление (Join Request)
bot.on('chat_join_request', async (ctx) => {
    const userId = ctx.chatJoinRequest.from.id;
    const userFirstName = ctx.chatJoinRequest.from.first_name;
    const privateChannelId = ctx.chatJoinRequest.chat.id;

    try {
        // Проверяем подписку на ОСНОВНОЙ канал
        const member = await ctx.telegram.getChatMember(PUBLIC_CHANNEL, userId);

        // Статусы, которые считаются "Подписан"
        const allowedStatuses = ['member', 'administrator', 'creator'];

        if (allowedStatuses.includes(member.status)) {
            // Если подписан — ОДОБРЯЕМ
            await ctx.approveChatJoinRequest(privateChannelId, userId);
            console.log(`✅ [ОДОБРЕН] ${userFirstName} (${userId}) подписан на основу.`);

            // Опционально: Можно отправить сообщение в личку (если юзер запускал бота раньше)
            // await ctx.telegram.sendMessage(userId, 'Доступ открыт. Добро пожаловать в цех.');
        } else {
            // Если НЕ подписан - ИГНОРИРУЕМ (пусть висит в заявках) 
            // Лучше игнорировать, чтобы он мог подписаться и попробовать снова (или ты вручную апрувнул)
            console.log(`❌ [ИГНОР] ${userFirstName} (${userId}) НЕ подписан на основу.`);
        }

    } catch (e) {
        console.error(`Ошибка при проверке юзера ${userId}:`, e);
    }
});

bot.launch();

// Обработка мягкой остановки
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
