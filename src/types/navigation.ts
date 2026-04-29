export type VoiceTransactionParams = {
  initialType?: 'income' | 'expense';
  initialAmount?: string;
  initialCategoryId?: string;
  initialNote?: string;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ResetPassword: undefined;
  Categories: undefined;
  AddTransaction: VoiceTransactionParams | undefined;
  EditTransaction: { transactionId: string };
  SetBudget: { categoryId?: string };
  CurrencySelection: undefined;
  CreateFamily: undefined;
  InviteMember: { familyId: string };
  EditFamily: { familyId: string };
  BatchVoice: undefined;
  EditProfile: undefined;
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
  AddTransaction: VoiceTransactionParams | undefined;
  EditTransaction: { transactionId: string };
};

export type CategoryStackParamList = {
  CategoryList: undefined;
};
