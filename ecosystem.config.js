module.exports = {
    apps: [
        {
            name: 'genel-crm-backend',
            cwd: 'C:/GenelCRM/backend',
            script: 'server.js',
            env: {
                NODE_ENV: 'production'
            },
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G'
        },
        {
            name: 'genel-crm-frontend',
            cwd: 'C:/GenelCRM/frontend',
            script: 'node_modules/serve/build/main.js',
            args: 'dist -s -l 5173',
            env: {
                NODE_ENV: 'production'
            },
            instances: 1,
            autorestart: true,
            watch: false
        }
    ]
};
