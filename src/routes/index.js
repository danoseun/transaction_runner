import express from 'express';
import { userController } from '../controllers/user';
import { verifyToken } from '../middleware/auth';



const { registerUser, loginUser, transferMoney, withdrawFromAccount, depositIntoAccount } = userController;

export const router = express.Router();

router.post('/api/v1/auth/users', registerUser);
router.post('/api/v1/auth/login', loginUser);
router.post('/api/v1/transfers', verifyToken, transferMoney);
router.post('/api/v1/deposits', verifyToken, depositIntoAccount);
router.post('/api/v1/withdrawals', verifyToken, withdrawFromAccount);
