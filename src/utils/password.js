import bcrypt from 'bcrypt';

/**
       * compare Password
       * @param {string} password
       * @param {string} hashedPassword
       * @returns {Boolean} return true or false
       */
 export const comparePassword = (password, hashedPassword) => bcrypt.compareSync(password, hashedPassword);