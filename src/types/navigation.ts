export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Categories: undefined;
  AddTransaction: undefined;
  EditTransaction: { transactionId: string };
  SetBudget: { categoryId?: string };
  CurrencySelection: undefined;
  CreateFamily: undefined;
  InviteMember: { familyId: string };
  EditFamily: { familyId: string };
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
  Family: undefined;
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
