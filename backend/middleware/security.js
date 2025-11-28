const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');

module.exports = (app) => {
    app.use(helmet());
    app.use(xss());
    app.use(mongoSanitize());
    app.use(hpp());
    app.use(rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message:{success:false, message:"Too many requests, please try again later."}
    }));
    app.disable('x-powered-by');
};