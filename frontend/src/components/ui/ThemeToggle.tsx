import { useTheme } from '../../services/theme';
import Icon from './Icon';
import './ThemeToggle.css';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối';
  return <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={label} title={label}>
    <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
  </button>;
}
