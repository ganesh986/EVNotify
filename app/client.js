RESTURL = 'https://evnotify.de:8743/', /* you can replace this with your custom EVNotify backend url if exists */
DEBUG = false,
VERSION = '1.0.0'
SOC_CMD = {
    IONIQ: '2105',  /* for compatibility to old versions only! */
    IONIQ_BEV: '2105',
    IONIQ_HEV: '2101',
    IONIQ_PHEV: '2101',
    SOUL_EV: '2105'
},
ROLLBAR_TOKEN = undefined, /* replace with your rollbar token if you want error tracking */
BLOCKDATA = '',
RAWDATA = '',
RUNNING_INTERVAL = false,
LAST_SOC = 0,
RUNNING_SYNC = false,
SYNC_MODE = 'disabled',
LAST_CAR_ACTIVITY = 0,
NOTIFICATION_SENT = false;