import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Construction } from 'lucide-react';

/**
 * UnderConstructionCard.js - Refactorizado
 * Tarjeta placeholder para componentes en desarrollo
 * Mejorado: seguridad (typeof checks), tooltip mejorado, validación robusta
 */
export default function UnderConstructionCard({
  title,
  value,
  icon,
  subtitle,
  children,
  onClick,
  className = '',
  help
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  const handleMouseEnter = (e) => {
    // Seguridad: typeof check antes de acceder a window
    try {
      const rect = e.currentTarget.getBoundingClientRect();
      const TOOLTIP_WIDTH = 240;
      const padding = 8;
      // Evitar overflow del viewport
      let left = rect.right + padding;
      if (typeof window !== 'undefined' && left + TOOLTIP_WIDTH > (window.innerWidth - padding)) {
        left = rect.left - TOOLTIP_WIDTH - padding;
      }
      left = Math.max(padding, left);
      setTooltipPos({ top: rect.top, left });
      setShowTooltip(true);
    } catch (err) {
      // Silenciar errores no críticos
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const defaultHelpContent = (
    <div>
      <div className="font-semibold text-sm text-gray-800 mb-1">Qué mide</div>
      <div className="text-xs text-gray-600 mb-2">Esta tarjeta mostrará la medida principal relacionada con &quot;{title}&quot;, por ejemplo una proporción, porcentaje o tiempo promedio que resume el estado de calidad.</div>
      <div className="font-semibold text-sm text-gray-800 mb-1">Por qué es útil</div>
      <div className="text-xs text-gray-600">Permite a responsables y equipos priorizar acciones, entender riesgos y comunicar el impacto en el negocio de forma simple y directa.</div>
    </div>
  );

  return (
    <>
      <div
        className={`kpi-card relative border-2 border-blue-200 bg-blue-50 opacity-80 px-3 py-2.5 ${onClick ? 'cursor-pointer hover:opacity-90 hover:shadow-lg transition-all' : 'cursor-not-allowed'} ${className}`}
        onClick={(e) => {
          try { console.debug && console.debug('UnderConstructionCard clicked:', title); } catch (err) {}
          if (typeof onClick === 'function') onClick(e);
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1">
          <Construction className="w-3 h-3" />
        </div>

        <div className="flex items-center justify-between mb-1">
          <div className="p-1 rounded-lg bg-blue-100 text-blue-600">{icon}</div>
          <span className="text-xs font-semibold text-blue-600 bg-white px-1.5 py-0 rounded">En desarrollo</span>
        </div>

        <h3 className="text-xs font-semibold text-gray-700 mb-0.5 line-through leading-tight">{title}</h3>

        {children ? (
          children
        ) : (
          <>
            <div className="mb-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-blue-400">{value}</span>
              </div>
              {subtitle && <p className="text-xs text-gray-600 mt-0.5 leading-tight">{subtitle}</p>}
            </div>

            <div className="mb-1">
              <div className="bg-white bg-opacity-50 rounded-full h-1 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-blue-300 to-blue-100 animate-pulse" />
              </div>
            </div>
          </>
        )}
      </div>

      {showTooltip && createPortal(
        <div
          style={{
            position: 'fixed',
            left: tooltipPos.left,
            top: tooltipPos.top,
            zIndex: 9999,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            padding: '0.5rem',
            fontSize: '0.8rem',
            color: '#374151',
            width: '16rem',
            pointerEvents: 'none'
          }}
        >
          {help || defaultHelpContent}
        </div>,
        document.body
      )}
    </>
  );
}