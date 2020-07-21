import { Router, Request, Response } from 'express';
import { getCustomRepository } from 'typeorm';
import multer from 'multer';

import TransactionsRepository from '../repositories/TransactionsRepository';
import CreateTransactionService from '../services/CreateTransactionService';
import DeleteTransactionService from '../services/DeleteTransactionService';
import ImportTransactionsService from '../services/ImportTransactionsService';

import uploadConfig from '../config/upload';
import Transaction from '../models/Transaction';

const upload = multer(uploadConfig);

const transactionsRouter = Router();

transactionsRouter.get('/', async (request: Request, response: Response) => {
  const transactionRepository = getCustomRepository(TransactionsRepository);
  const transactions = await transactionRepository.find({
    relations: ['category'],
  });

  const balance = await transactionRepository.getBalance();
  return response.json({ transactions, balance });
});

transactionsRouter.post('/', async (request: Request, response: Response) => {
  const { title, value, type, category } = request.body;
  const createTransaction = new CreateTransactionService();
  const transaction = await createTransaction.execute({
    title,
    value,
    type,
    category,
  });

  return response.json(transaction);
});

transactionsRouter.delete(
  '/:id',
  async (request: Request, response: Response) => {
    const { id } = request.params;
    const deleteTransaction = new DeleteTransactionService();
    await deleteTransaction.execute(id);

    return response.status(204).send();
  },
);

transactionsRouter.post(
  '/import',
  upload.array('file'),
  async (request: Request, response: Response) => {
    const importTransaction = new ImportTransactionsService();
    const requestFiles = request.files as Express.Multer.File[];
    const transactionPromises: Promise<
      Transaction[] | null
    >[] = requestFiles.map((file: Express.Multer.File) =>
      importTransaction.execute(file.path),
    );
    const transactionsArrays = await Promise.all(transactionPromises);
    const transactions: Transaction[] = [];
    transactionsArrays.forEach(newTransactions => {
      if (newTransactions === null) return;
      newTransactions.forEach(transaction => transactions.push(transaction))
    });

    return response.json(transactions);
  },
);

export default transactionsRouter;
