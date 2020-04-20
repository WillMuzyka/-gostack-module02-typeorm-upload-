import { getRepository, getCustomRepository } from 'typeorm';

import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';
import TransactionRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category: category_title,
  }: Request): Promise<Transaction> {
    const transactionRepository = getCustomRepository(TransactionRepository);
    // check if have enough money
    if (type === 'outcome') {
      const { total } = await transactionRepository.getBalance();
      if (total - value < 0) throw new AppError('Insufficient balance.');
    }
    // check if the category exists
    const categoryRepository = getRepository(Category);

    let category = await categoryRepository.findOne({
      where: { title: category_title },
    });
    // if not, create a new category
    if (!category) {
      category = categoryRepository.create({
        title: category_title,
      });
      await categoryRepository.save(category);
    }

    // create transaction
    const transaction = transactionRepository.create({
      title,
      value,
      type,
      category_id: category.id,
    });
    await transactionRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
