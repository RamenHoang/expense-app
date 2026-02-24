export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Categories: undefined;
  AddTransaction: undefined;
  EditTransaction: { transactionId: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Budget: undefined;
  Settings: undefined;
};

export type TransactionStackParamList = {
  TransactionList: undefined;
  AddTransaction: undefined;
  EditTransaction: { transactionId: string };
};

export type CategoryStackParamList = {
  CategoryList: undefined;
};
