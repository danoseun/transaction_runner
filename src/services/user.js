import joi from 'joi';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { v4 } from 'uuid';
import models from '../database/models'
import { creditAccount, debitAccount } from '../helpers/transactions';
import { comparePassword } from '../utils/password';
import { createToken } from '../middleware/auth';



dotenv.config();

/**
 * @param {string} username username of the user
 * @param {string} password password of the user
*/
export async function createUser(username, password) {
  const schema = joi.object({
    username: joi.string().required(),
    password: joi.string().required(),
  });
  
  const validation = schema.validate({ username, password });
  
  if (validation.error) {
    return {
      success: false,
      error: validation.error.details[0].message,
    };
  }
  const t = await models.sequelize.transaction();

  try {
    const existingUser = await models.users.findOne({ where: { username } }, { transaction: t });
    
    if (existingUser) {
        return 'User exists';
    }
    const user = await models.users.create({
      username,
      password: bcrypt.hashSync(password, bcrypt.genSaltSync(Number(process.env.ROUNDS))),
    }, {
      transaction: t,
    });
    
    const account = await models.accounts.create({
      user_id: user.id, balance: 5000000,
    }, {
      transaction: t,
    });
    
    await t.commit();

    return {
      message: 'User created',
      id: account.id
    }
  } catch (error) {
      console.log('ERROR', error);
    await t.rollback();
    return 'An error occured';
  }
}


/**
 * @param {string} username username of the user
 * @param {string} password password of the user
*/
export async function loginUser(username, password) {
    const schema = joi.object({
      username: joi.string().required(),
      password: joi.string().required(),
    });
    
    const validation = schema.validate({ username, password });
    
    if (validation.error) {
      return {
        success: false,
        error: validation.error.details[0].message,
      };
    }
  
    try {
      const existingUser = await models.users.findOne({ where: { username } });
      
      if (existingUser) {
          const compare = comparePassword(password, existingUser.dataValues.password);
          if(!compare){
              return 'username or password incorrect'
          }

          delete existingUser.dataValues.password;
          const token = createToken(existingUser.dataValues);
          return token;
      }
      return 'Authentication failed'
    } catch (error) {
      return 'An error occured';
    }
  }

/**
 * @param {number} account_id account_id of the account
 * @param {number} amount amount to deposit
*/
async function deposit(account_id, amount) {
  const schema = joi.object({
    account_id: joi.number().required(),
    amount: joi.number().min(1).required(),
  });
  const validation = schema.validate({ account_id, amount });
  if (validation.error) {
    return res.status(400).json({
        success: false,
        error: validation.error.details[0].message,
    })
  }
  const t = await models.sequelize.transaction();
  try {
    const creditResult = await creditAccount({
      account_id,
      amount,
      purpose: 'deposit',
      t,
    });

    if (!creditResult.success) {
      await t.rollback();
      return creditResult;
    }

    await t.commit();
    return res.status(200).json({
        success: true,
        message: 'deposit successful',
    }) 
  } catch (error) {
    await t.rollback();
    return res.status(500).json({
        success: false,
        message: 'Internal server error'
    })
  }
}

/**
 * @param {number} account_id account_id of the account
 * @param {number} amount amount to withdraw
*/
async function withdraw(account_id, amount) {
  const schema = joi.object({
    account_id: joi.number().required(),
    amount: joi.number().min(1).required(),
  });
  const validation = schema.validate({ account_id, amount });
  if (validation.error) {
    return res.status(400).json({
        success: false,
        error: validation.error.details[0].message,
    })
  }
  const t = await models.sequelize.transaction();
  try {
    const debitResult = await debitAccount({
      account_id,
      amount,
      purpose: 'withdrawal',
      t,
    });

    if (!debitResult.success) {
      await t.rollback();
      return debitResult;
    }

    await t.commit();
    return res.status(200).json({
        success: true,
        message: 'withdrawal successful',
    }) 
  } catch (error) {
    await t.rollback();
    return res.status(500).json({
        success: false,
        message: 'Internal server error'
    })
  }
}

/**
 * @param {number} sender_id account_id of the sender
 * @param {number} recipient_id account_id of the recipient
 * @param {number} amount amount to deposit
*/
export async function transfer(req, sender_id, recipient_id, amount, purpose) {

  const schema = joi.object({
        sender_id: joi.number().required(),
        recipient_id: joi.number().required(),
        amount: joi.number().min(1).required(),
  });
      const validation = schema.validate({ sender_id, recipient_id, amount });
      if (validation.error) {
        return {
          success: false,
          error: validation.error.details[0].message,
        };
      }
      
      const recipient = await models.accounts.findOne({ where: { id: recipient_id  } });
      if(!recipient){
        return 'No user with this account details'
      }
      // credit recipient
      await models.accounts.increment({ balance: amount }, {where: {id: recipient.id} });
      await models.transactions.create({
        txn_type: 'credit',
        purpose,
        amount,
        account_id:recipient.id,
        reference: v4(),
        metadata,
        balance_before: Number(recipient.balance),
        balance_after: Number(recipient.balance) + Number(amount),
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      // debit sender
      await models.accounts.increment({ balance: -amount }, { where: { id: account_id} });
      await models.transactions.create({
        txn_type: 'debit',
        purpose,
        amount,
        account_id,
        reference,
        metadata,
        balance_before: Number(account.balance),
        balance_after: Number(account.balance) - Number(amount),
        created_at: Date.now(),
        updated_at: Date.now(),
      });
}

/**
 * @param {string} reference reference of the transaction to reverse
*/
async function reverse(reference) {
  // find the transaction
  const t = await models.sequelize.transaction();
  const txn_reference = v4();
  const purpose = 'reversal';
  try {
    const transactions = await models.transactions.findAll({
      where: { reference },
    }, { transaction: t });
    const transactionsArray = transactions.map((transaction) => {
      if (transaction.txn_type === 'debit') {
        return creditAccount({
          amount: transaction.amount,
          account_id: transaction.account_id,
          metadata: {
            originalReference: transaction.reference,
          },
          purpose,
          reference: txn_reference,
          t,
        });
      }
      return debitAccount({
        amount: transaction.amount,
        account_id: transaction.account_id,
        metadata: {
          originalReference: transaction.reference,
        },
        purpose,
        reference: txn_reference,
        t,
      });
    });
    const reversalResult = await Promise.all(transactionsArray);

    const failedTxns = reversalResult.filter((result) => !result.success);
    if (failedTxns.length) {
      await t.rollback();
      return reversalResult;
    }

    await t.commit();
    return {
      success: true,
      message: 'Reversal successful',
    };
  } catch (error) {
    await t.rollback();
    return {
      success: false,
      error: 'Internal server error',
    };
  }
}
