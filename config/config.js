module.exports = {
    jwtSecretKey : 'IGP-Key',
    saltRounds:10,
    dashboardRounds:8,
    //PostgreSQL
    PG_USER: 'postgres',
    PG_HOST: '10.1.1.123',
    PG_DATABASE: 'postgres',
    PG_PASSWORD: '80466612',
    PG_PORT:'5432',
    //InfluxDB
    //TCP Server
    TCP_HOST: '127.0.0.1',
    // TCP_HOST: '104.199.203.118',
    TCP_PORT: 4000,
    // 收到數據時清除超時定時器
    TCP_TIMEOUT: 130000,
}
