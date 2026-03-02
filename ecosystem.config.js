module.exports = {
  apps: [{
    name: 'socialbudi-linkedin',
    script: 'src/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
     NODE_ENV: 'production',
     PORT: 3000,
     USE_BRIGHTDATA: 'true',
     BRIGHTDATA_WS_ENDPOINT: 'wss://brd-customer-hl_face70b2-zone-linkedin_scraper:t55pt4z84d5n@brd.superproxy.io:9222'
    },
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
