import { useState, useEffect } from 'react';
import { getCurrencyInfo } from '@/lib/currency';
import { useSession } from 'next-auth/react';

export function useCurrency() {
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [currencyCode, setCurrencyCode] = useState('INR');
  const [isLoaded, setIsLoaded] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const loadCurrency = async () => {
      // If no session, use default INR
      if (!session?.user?.id) {
        setCurrencyCode('INR');
        setCurrencySymbol('₹');
        setIsLoaded(true);
        return;
      }

      try {
        // Load currency preference from backend
        const response = await fetch('/api/user/settings');
        if (response.ok) {
          const data = await response.json();
          const code = data.preferredCurrency || 'INR';
          const currencyInfo = getCurrencyInfo(code);
          
          console.log('Loading currency from backend:', { code, symbol: currencyInfo?.symbol }); // Debug log
          
          setCurrencyCode(code);
          setCurrencySymbol(currencyInfo?.symbol || '₹');
        } else {
          // Fallback to default
          setCurrencyCode('INR');
          setCurrencySymbol('₹');
        }
      } catch (error) {
        console.error('Error loading currency preference:', error);
        // Fallback to default
        setCurrencyCode('INR');
        setCurrencySymbol('₹');
      } finally {
        setIsLoaded(true);
      }
    };

    // Load currency when session is available
    if (session !== undefined) {
      loadCurrency();
    }

    // Listen for currency changes
    const handleCurrencyChange = (event: CustomEvent) => {
      const newCurrencyCode = event.detail;
      const currencyInfo = getCurrencyInfo(newCurrencyCode);
      
      console.log('Currency changed to:', newCurrencyCode, currencyInfo); // Debug log
      
      if (currencyInfo) {
        setCurrencyCode(newCurrencyCode);
        setCurrencySymbol(currencyInfo.symbol);
      }
    };

    window.addEventListener('currencyChanged', handleCurrencyChange as EventListener);

    return () => {
      window.removeEventListener('currencyChanged', handleCurrencyChange as EventListener);
    };
  }, [session]);

  const formatAmount = (amount: number): string => {
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  return {
    currencySymbol,
    currencyCode,
    formatAmount,
    isLoaded
  };
}