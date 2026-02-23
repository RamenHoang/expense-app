-- Function to create default categories for new users
CREATE OR REPLACE FUNCTION create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO categories (user_id, name, type, icon, color) VALUES
    -- Income categories
    (NEW.id, 'Salary', 'income', 'cash', '#4CAF50'),
    (NEW.id, 'Freelance', 'income', 'laptop', '#8BC34A'),
    (NEW.id, 'Investment', 'income', 'chart-line', '#00BCD4'),
    
    -- Expense categories
    (NEW.id, 'Food & Dining', 'expense', 'food', '#FF5722'),
    (NEW.id, 'Transportation', 'expense', 'car', '#FF9800'),
    (NEW.id, 'Shopping', 'expense', 'shopping', '#E91E63'),
    (NEW.id, 'Entertainment', 'expense', 'movie', '#9C27B0'),
    (NEW.id, 'Bills & Utilities', 'expense', 'file-document', '#F44336'),
    (NEW.id, 'Healthcare', 'expense', 'hospital', '#03A9F4'),
    (NEW.id, 'Education', 'expense', 'school', '#3F51B5'),
    (NEW.id, 'Others', 'expense', 'dots-horizontal', '#607D8B');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create categories on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_categories();
