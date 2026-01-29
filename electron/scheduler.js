const schedule = require('node-schedule');

// EmailService lazy loaded - döngüsel bağımlılığı önlemek için
let emailService = null;
function getEmailService() {
    if (!emailService) {
        emailService = require('./emailService');
    }
    return emailService;
}

let scheduledJob = null;
let lastRunTime = null;
let lastRunStatus = null;

// Zamanlayıcıyı başlat
function start() {
    try {
        stop(); // Önceki job varsa durdur

        const settings = getEmailService().getEmailSettings();

        if (!settings.enabled) {
            console.log('Email scheduler is disabled');
            return { success: true, status: 'disabled' };
        }

        const hour = settings.scheduleHour || 18;
        const minute = settings.scheduleMinute || 0;

        // Her gün belirtilen saatte çalıştır
        const rule = new schedule.RecurrenceRule();
        rule.hour = hour;
        rule.minute = minute;
        rule.tz = 'Europe/Istanbul';

        scheduledJob = schedule.scheduleJob(rule, async () => {
            console.log(`Running scheduled email job at ${new Date().toISOString()}`);
            try {
                const result = await getEmailService().sendDailyReport();
                lastRunTime = new Date().toISOString();
                lastRunStatus = result.success ? 'success' : 'error';
                console.log('Scheduled email result:', result);
            } catch (error) {
                lastRunTime = new Date().toISOString();
                lastRunStatus = 'error';
                console.error('Scheduled email error:', error);
            }
        });

        console.log(`Email scheduler started: Daily at ${hour}:${String(minute).padStart(2, '0')}`);
        return {
            success: true,
            status: 'running',
            schedule: `Her gün saat ${hour}:${String(minute).padStart(2, '0')}`
        };
    } catch (error) {
        console.error('Scheduler start error:', error);
        return { success: false, error: error.message };
    }
}

// Zamanlayıcıyı durdur
function stop() {
    if (scheduledJob) {
        scheduledJob.cancel();
        scheduledJob = null;
        console.log('Email scheduler stopped');
    }
    return { success: true, status: 'stopped' };
}

// Zamanlayıcı durumunu getir
function getStatus() {
    const settings = getEmailService().getEmailSettings();
    return {
        enabled: settings.enabled,
        running: scheduledJob !== null,
        schedule: `${settings.scheduleHour || 18}:${String(settings.scheduleMinute || 0).padStart(2, '0')}`,
        lastRunTime,
        lastRunStatus,
        nextRun: scheduledJob ? scheduledJob.nextInvocation()?.toISOString() : null
    };
}

// Zamanlayıcıyı yeniden başlat (ayarlar değiştiğinde)
function restart() {
    stop();
    return start();
}

module.exports = {
    start,
    stop,
    restart,
    getStatus
};
