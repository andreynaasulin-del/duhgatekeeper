require('dotenv').config();
const { Telegraf } = require('telegraf');
const http = require('http');

// Токен и канал берутся из .env файла
const bot = new Telegraf(process.env.BOT_TOKEN);
let PUBLIC_CHANNEL = process.env.PUBLIC_CHANNEL || '@duhdeveloperhub';

// Автоматически добавляем @, если его нет (защита от дурака)
if (!PUBLIC_CHANNEL.startsWith('@')) {
    console.log(`⚠️ Добавляю отсутствующий @ к ${PUBLIC_CHANNEL}`);
    PUBLIC_CHANNEL = '@' + PUBLIC_CHANNEL;
}
console.log('Целевой канал:', PUBLIC_CHANNEL);

// Health-check сервер для Render (чтобы не ругался на отсутствие порта)
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Gatekeeper Bot is running!');
}).listen(PORT, () => {
    console.log(`Health-check сервер запущен на порту ${PORT}`);
});

console.log('Gatekeeper Bot запустился и ждет заявок...');

const ADMIN_ID = 7984904430;

// Слушаем запросы на вступление (Join Request)
bot.on('chat_join_request', async (ctx) => {
    const userId = ctx.chatJoinRequest.from.id;
    const userFirstName = ctx.chatJoinRequest.from.first_name || 'Незнакомец';
    const userUsername = ctx.chatJoinRequest.from.username ? `@${ctx.chatJoinRequest.from.username}` : 'нет юзернейма';
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

        } else {
            // Если НЕ подписан - ИГНОРИРУЕМ
            console.log(`❌ [ИГНОР] ${userFirstName} (${userId}) НЕ подписан на основу.`);

            // 1. Пишем юзеру
            try {
                await ctx.telegram.sendMessage(userId, `🛑 <b>Доступ закрыт!</b>\n\nЧтобы я автоматически одобрил твою заявку, ты должен быть подписан на основной канал: ${PUBLIC_CHANNEL}\n\n👉 <b>Подпишись и подай заявку снова!</b>`, { parse_mode: 'HTML' });
            } catch (err) {
                console.log(`⚠️ Не удалось написать юзеру в ЛС: ${err.message}`);
            }

            // 2. СТУЧИМ АДМИНУ
            try {
                await ctx.telegram.sendMessage(ADMIN_ID,
                    `⚠️ <b>Попытка входа без подписки!</b>\n\n` +
                    `👤 <b>Имя:</b> ${userFirstName}\n` +
                    `🔗 <b>Link:</b> ${userUsername}\n` +
                    `🆔 <b>ID:</b> <code>${userId}</code>\n\n` +
                    `⚡️ <a href="tg://user?id=${userId}">НАПИСАТЬ ЕМУ В ЛС</a>`,
                    { parse_mode: 'HTML' }
                );
            } catch (err) {
                console.error('Не удалось отправить отчет админу:', err);
            }
        }

    } catch (e) {
        console.error(`Ошибка при проверке юзера ${userId}:`, e);
    }
});

bot.launch({
    dropPendingUpdates: true
}).then(() => {
    console.log('✅ Бот успешно подключен к Telegram!');
}).catch((err) => {
    console.error('❌ Ошибка запуска бота:', err.message);
});

// Обработка мягкой остановки
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
