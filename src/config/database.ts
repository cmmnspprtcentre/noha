// This file contains the configuration for connecting to the database, including connection strings and options.

import { Sequelize } from 'sequelize';

const database = new Sequelize(process.env.DB_NAME || '', process.env.DB_USER || '', process.env.DB_PASSWORD || '', {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres', // or 'mysql', 'sqlite', 'mariadb', 'mssql'
    logging: false, // Set to true for SQL query logging
});

export default database;