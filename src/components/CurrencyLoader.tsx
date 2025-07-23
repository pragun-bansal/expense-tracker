export function CurrencyLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-6 p-8">
        <div className="relative w-64 h-48 bg-card rounded-[12px] shadow-lg border border-green-200/30 overflow-hidden">
          {/* Header */}
          <div className="h-12 bg-green-50 dark:bg-gray-700 border-b border-green-200/30 flex items-center px-4">
            <div className="w-20 h-3 bg-green-400/40 rounded animate-pulse"></div>
            <div className="ml-auto flex gap-2">
              <div className="w-6 h-6 bg-green-400/30 rounded-full animate-pulse"></div>
              <div className="w-6 h-6 bg-green-400/20 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
          
          {/* Main content area */}
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 h-12 bg-gradient-to-r from-green-400/20 to-green-400/10 rounded-[6px] animate-pulse transform hover:scale-105 transition-transform"></div>
              <div className="flex-1 h-12 bg-gradient-to-r from-green-400/15 to-green-400/5 rounded-[6px] animate-pulse transform hover:scale-105 transition-transform" style={{animationDelay: '0.3s'}}></div>
              <div className="flex-1 h-12 bg-gradient-to-r from-green-400/10 to-green-400/20 rounded-[6px] animate-pulse transform hover:scale-105 transition-transform" style={{animationDelay: '0.6s'}}></div>
            </div>
            
            <div className="space-y-2">
              <div className="h-8 bg-green-100/50 dark:bg-gray-600/50 rounded animate-pulse transform translate-x-0 hover:translate-x-1 transition-transform"></div>
              <div className="h-8 bg-green-100/30 dark:bg-gray-600/30 rounded animate-pulse transform translate-x-0 hover:translate-x-1 transition-transform" style={{animationDelay: '0.4s'}}></div>
              <div className="h-8 bg-green-100/40 dark:bg-gray-600/40 rounded animate-pulse transform translate-x-0 hover:translate-x-1 transition-transform" style={{animationDelay: '0.8s'}}></div>
            </div>
          </div>
          
          {/* Falling currency notes */}
          {/* First set of notes */}
          <div className="absolute top-0 left-1/4 w-8 h-4 bg-gradient-to-r from-green-500 to-green-600 rounded-sm shadow-md animate-[fall_2s_infinite] opacity-80">
            <div className="text-white text-xs font-bold text-center leading-4">$</div>
          </div>
          <div className="absolute top-0 left-1/2 w-8 h-4 bg-gradient-to-r from-green-500 to-green-600 rounded-sm shadow-md animate-[fall_2s_infinite] opacity-80" style={{animationDelay: '0.3s'}}>
            <div className="text-white text-xs font-bold text-center leading-4">$</div>
          </div>
          <div className="absolute top-0 right-1/4 w-8 h-4 bg-gradient-to-r from-green-500 to-green-600 rounded-sm shadow-md animate-[fall_2s_infinite] opacity-80" style={{animationDelay: '0.6s'}}>
            <div className="text-white text-xs font-bold text-center leading-4">$</div>
          </div>
          
          {/* Second set of notes */}
          <div className="absolute top-0 left-1/6 w-8 h-4 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-sm shadow-md animate-[fall_2.5s_infinite] opacity-70" style={{animationDelay: '1s'}}>
            <div className="text-white text-xs font-bold text-center leading-4">$</div>
          </div>
          <div className="absolute top-0 left-2/3 w-8 h-4 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-sm shadow-md animate-[fall_2.5s_infinite] opacity-70" style={{animationDelay: '1.3s'}}>
            <div className="text-white text-xs font-bold text-center leading-4">$</div>
          </div>
          <div className="absolute top-0 right-1/6 w-8 h-4 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-sm shadow-md animate-[fall_2.5s_infinite] opacity-70" style={{animationDelay: '1.6s'}}>
            <div className="text-white text-xs font-bold text-center leading-4">$</div>
          </div>
          
          {/* Third set of notes */}
          <div className="absolute top-0 left-1/3 w-8 h-4 bg-gradient-to-r from-teal-500 to-teal-600 rounded-sm shadow-md animate-[fall_3s_infinite] opacity-60" style={{animationDelay: '2s'}}>
            <div className="text-white text-xs font-bold text-center leading-4">$</div>
          </div>
          <div className="absolute top-0 left-3/5 w-8 h-4 bg-gradient-to-r from-teal-500 to-teal-600 rounded-sm shadow-md animate-[fall_3s_infinite] opacity-60" style={{animationDelay: '2.3s'}}>
            <div className="text-white text-xs font-bold text-center leading-4">$</div>
          </div>
          <div className="absolute top-0 right-1/3 w-8 h-4 bg-gradient-to-r from-teal-500 to-teal-600 rounded-sm shadow-md animate-[fall_3s_infinite] opacity-60" style={{animationDelay: '2.6s'}}>
            <div className="text-white text-xs font-bold text-center leading-4">$</div>
          </div>

          {/* Progress bar at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-100/30 dark:bg-gray-600/30">
            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 animate-pulse rounded"></div>
          </div>
        </div>
        
        <div className="text-center">
          <h3 className="text-[15px] font-semibold text-gray-700 dark:text-white mb-2">
            Loading Financial Data
          </h3>
          <p className="text-muted text-[12px] animate-pulse">
            Calculating your expenses...
          </p>
        </div>

        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.6s'}}></div>
        </div>
        
      </div>
      
      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            transform: translateY(200px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}