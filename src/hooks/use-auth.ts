import { useContext } from 'react';
import { AuthContext } from '@/app/contexts/auth-context';

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  
  return context;
}

export default useAuth;