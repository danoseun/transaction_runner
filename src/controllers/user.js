import { createUser, loginUser, transfer } from '../services/user';
import models from '../database/models'
import joi from 'joi';
import { v4 } from 'uuid';


export const userController = {
    /**
     * create user and create account accordingly
     */
    async registerUser(req, res) {
        const { username, password } = req.body;
        try {
            const result = await createUser(username, password);
            if (result === 'User exists') {
                return res.status(409).json({
                    success: true,
                    message: 'account already exists'
                })
            }
            if (result.message === 'User created') {
                return res.status(201).json({
                    success: true,
                    account_id: result.id,
                    message: 'account creation was successful'
                })
            }
            return res.status(400).json({
                message: 'username or password is missing'
            })
        } catch (error) {
            return res.status(500).json({
                success: false,
                error
            })
        }
    },


    /**
     * log users in
     */
    async loginUser(req, res) {
        const { username, password } = req.body;
        try {
            const result = await loginUser(username, password);
            if (result === 'Authentication failed') {
                return res.status(401).json({
                    success: false,
                    message: 'authentication failed'
                })
            }
            if (result.includes('username')) {
                return res.status(401).json({
                    success: false,
                    message: 'username or password incorrect'
                })
            }
            return res.status(200).json({
                success: true,
                token: result
            })
        } catch (error) {
            return res.status(500).json({
                success: false,
                error
            })
        }
    },

    /**
     * Transfer money
     * from one user to
     * another
     */
    async transferMoney(req, res) {
        const { recipient_id, amount } = req.body;
        const schema = joi.object({
            recipient_id: joi.number().required(),
            amount: joi.number().min(1).required(),
        });
        const validation = schema.validate({ recipient_id, amount });
        if (validation.error) {
            return {
                success: false,
                error: validation.error.details[0].message,
            };
        }

        try {
        const sender = await models.accounts.findOne({ where: { user_id: req.authData.payload.id } });

        // check if sender has enough money
        if (Number(sender.balance) < amount) {
            return {
                success: false,
                error: 'Insufficient balance',
            };
        }

            const recipient = await models.accounts.findOne({ where: { id: recipient_id } });
            if (!recipient) {
                return res.status(404).json({
                    message: 'No user with this account details'
                })
            }

            // debit sender
            await sender.decrement('balance', { by: Number(amount)})
            
            await models.transactions.create({
                txn_type: 'debit',
                purpose: 'transfer',
                amount,
                account_id: sender.id,
                reference: v4(),
                metadata:{sender},
                balance_before: Number(sender.balance),
                balance_after: Number(sender.balance) - Number(amount),
                created_at: Date.now(),
                updated_at: Date.now(),
            });
            
            // credit recipient
            await recipient.increment('balance', { by: Number(amount)})
            
            await models.transactions.create({
                txn_type: 'credit',
                purpose: 'transfer',
                amount,
                account_id: recipient.id,
                reference: v4(),
                metadata:{recipient},
                balance_before: Number(recipient.balance),
                balance_after: Number(recipient.balance) + Number(amount),
                created_at: Date.now(),
                updated_at: Date.now(),
            });
            
            return res.status(200).json({
                status: true,
                message: 'transfer was successful'
            })
        } catch (error) {
            return res.status(500).json({
                status: false,
                error
            })
        }
    },

    /**
     * Deposit money
     * into user account
     */
    async depositIntoAccount(req, res){
        const { recipient_id, amount } = req.body;
        const schema = joi.object({
            recipient_id: joi.number().required(),
            amount: joi.number().min(1).required(),
        });
        const validation = schema.validate({ recipient_id, amount });
        if (validation.error) {
            return {
                success: false,
                error: validation.error.details[0].message,
            };
        }

        const recipient = await models.accounts.findOne({ where: { id: recipient_id } });
            if (!recipient) {
                return res.status(404).json({
                    message: 'No user with this account details'
                })
            }

        try {
            // credit recipient
            await recipient.increment('balance', { by: Number(amount)})
            
            await models.transactions.create({
                txn_type: 'credit',
                purpose: 'deposit',
                amount,
                account_id: recipient.id,
                reference: v4(),
                metadata:{recipient},
                balance_before: Number(recipient.balance),
                balance_after: Number(recipient.balance) + Number(amount),
                created_at: Date.now(),
                updated_at: Date.now(),
            });
            
            return res.status(200).json({
                status: true,
                message: 'deposit was successful'
            })
        } catch(error){
            return res.status(500).json({
                status: false,
                error
            })
        }
    },

    /**
     * Withdraw from 
     * user's account
     */
    async withdrawFromAccount(req, res){
        const { amount } = req.body;
        const schema = joi.object({
            amount: joi.number().min(1).required(),
        });
        const validation = schema.validate({ amount });
        if (validation.error) {
            return {
                success: false,
                error: validation.error.details[0].message,
            };
        }

        const userAccount = await models.accounts.findOne({ where: { user_id: req.authData.payload.id } });

        // check if user has enough money in account
        if (Number(userAccount.balance) < amount) {
            return res.status(400).json({
                success: false,
                error: 'Insufficient balance',
            });
        }

        try {
            // debit user
            await userAccount.decrement('balance', { by: Number(amount)})
            
            await models.transactions.create({
                txn_type: 'debit',
                purpose: 'withdrawal',
                amount,
                account_id: userAccount.id,
                reference: v4(),
                metadata:{userAccount},
                balance_before: Number(userAccount.balance),
                balance_after: Number(userAccount.balance) - Number(amount),
                created_at: Date.now(),
                updated_at: Date.now(),
            });
            
            return res.status(200).json({
                status: true,
                message: 'withdrawal was successful'
            })
        } catch(error){
            return res.status(500).json({
                status: false,
                error
            })
        }
    }
}
