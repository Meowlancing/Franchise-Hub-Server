const express = require('express');
const jwt  = require('jsonwebtoken');
const bcrypt  = require('bcrypt');
const mongoose = require('mongoose');

const admcred = require('./schemas/admin-login-cred');
const admtoken = require('./schemas/admin-access-token');
const sweeptoken = require('./cronjobs/tokenSweep');

require('dotenv').config();

// init. express
const app = express();
require('./mdb').connectdb();
sweeptoken.start();

// register middleware
const isTokenValid = require('./middlewares/isTokenValid');
app.use(express.json());

// admin login
app.post('/api/v1/admin/login', isTokenValid, async (req, res) => {
        try {
                if (req.IS_TOKEN_VALID)
                        return res.send({
                                success: true,
                                message: "You are already authorised"
                        });

                const adminUser = await admcred.findById(req.body.username);
                
                if (adminUser == null)
                        return res.send({
                                success: false,
                                message: "Invalid credential(s)"
                        });
                
                (async () => {
                        if (await bcrypt.compare(req.body.password, adminUser.password)) {
                                const token = jwt.sign({ username: req.body.username }, process.env.JWT_ACCESS_SECRET);
                                await admtoken.create({
                                        access_token: token,
                                        expires_at: Date.now() + process.env.JWT_ACCESS_WINDOW
                                });

                                return res.send({
                                        success: true,
                                        message: "Admin authorised",
                                        access_token: token
                                });
                        }
                        else
                                return res.status(403).send({
                                        success: false,
                                        message: "Invalid credential(s)"
                                });
                })();
        } catch (e) {
                res.status(500).send({
                        success: false,
                        message: "Internal server error: " + e
                });
        }
});

app.listen(
        process.env.PORT || 3000,
        () => console.log(`Listening on PORT ${process.env.PORT}...`)
);