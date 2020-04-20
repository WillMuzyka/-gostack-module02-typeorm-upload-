import { getCustomRepository } from 'typeorm';
import TransactionsRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    // check if id exists
    const transaction = await transactionsRepository.findOne(id);
    if (!transaction) throw new AppError('This id does not exist.', 404);

    await transactionsRepository.remove(transaction);
  }
}

export default DeleteTransactionService;
