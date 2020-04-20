import csvParse from 'csv-parse';
import fs from 'fs';
import { getRepository, getCustomRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionRepository from '../repositories/TransactionsRepository';

interface TransactionsData {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[] | null> {
    const categoriesData: string[] = [];
    const transactionsData: TransactionsData[] = [];

    // create a read stream and parsers
    const readStream = fs.createReadStream(filePath);
    const parsers = csvParse({
      from_line: 2,
    });
    // get all the data from the csv
    const parseCSV = readStream.pipe(parsers);
    parseCSV.on('data', async line => {
      const [title, type, valueS, category] = line.map((info: string) =>
        info.trim(),
      );
      const value = Number(valueS);
      if (!title || !type || !value || !category) return null;

      categoriesData.push(category);
      transactionsData.push({ title, type, value, category });
    });
    // await to read everything
    await new Promise(resolve => parseCSV.on('end', resolve));

    // check to see if the balance is positive
    let totalSum = 0;
    const income = transactionsData.reduce((prev, data) => {
      totalSum += data.value;
      if (data.type === 'income') return prev + data.value;
      return prev;
    }, 0);

    if (2 * income - totalSum < 0) return null;

    // check the categories that already exist
    const categoriesRepository = getRepository(Category);
    const existentCategories = await categoriesRepository.find({
      where: { title: In(categoriesData) },
    });
    const existentCategoriesTitle = existentCategories.map(cat => cat.title);
    // get all the categories that need to be created
    const toAddCategoriesTitles = categoriesData
      .filter(category => !existentCategoriesTitle.includes(category))
      .filter((category, index, array) => array.indexOf(category) === index);
    // create the extra categories
    const toAddCategoriesPromises = toAddCategoriesTitles.map(category => {
      const newCategory = categoriesRepository.create({ title: category });
      return categoriesRepository.save(newCategory);
    });
    await Promise.all(toAddCategoriesPromises);

    // get the list of all categories
    const categories = await categoriesRepository.find();
    const transactionsDataFormatted = transactionsData.map(
      ({ title, type, value, category }: TransactionsData) => {
        const fullCategory = categories.find(cat => cat.title === category);
        const category_id = fullCategory?.id;
        return {
          title,
          type,
          value,
          category_id,
        };
      },
    );

    // create all the transactions
    const transactionRepository = getCustomRepository(TransactionRepository);
    const transactionCreatePromise = transactionsDataFormatted.map(
      transactionData => {
        const newTransaction = transactionRepository.create(transactionData);
        return transactionRepository.save(newTransaction);
      },
    );

    const transactions = await Promise.all(transactionCreatePromise);

    return transactions;
  }
}

export default ImportTransactionsService;
