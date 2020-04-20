import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    let totalSum = 0;
    const income = transactions.reduce((prev, transaction) => {
      totalSum += transaction.value;
      return transaction.type === 'income' ? prev + transaction.value : prev;
    }, 0);

    const outcome = totalSum - income;
    const balance = {
      income,
      outcome,
      total: income - outcome,
    };

    return balance;
  }
}

export default TransactionsRepository;
