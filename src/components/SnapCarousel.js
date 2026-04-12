import React, { useRef, useEffect, useState } from 'react';

/**
 * SnapCarousel - A generic horizontal scroll-snap carousel component.
 * @param {Array} items - Array of objects with at least { id, name }
 * @param {string|number} activeId - The current selected item ID
 * @param {function} onChange - Callback when selection changes
 * @param {string} themeColor - Optional base color for active state (Tailwind class or hex)
 */
export default function SnapCarousel({ 
  items = [], 
  activeId, 
  onChange, 
  themeColor = 'blue' 
}) {
  const scrollRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef(null);
  const lastInternalId = useRef(activeId);

  const scrollToActive = (id) => {
    if (!scrollRef.current) return;
    const activeIdx = items.findIndex(item => item.id === id);
    if (activeIdx !== -1) {
      const container = scrollRef.current;
      const elements = container.querySelectorAll('.snap-item');
      if (elements[activeIdx]) {
        elements[activeIdx].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  };

  useEffect(() => {
    // Sync external changes (like initial load)
    if (activeId !== lastInternalId.current && !isScrolling) {
      scrollToActive(activeId);
    }
  }, [activeId, items.length]);

  const handleScroll = () => {
    setIsScrolling(true);
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    scrollTimeout.current = setTimeout(() => {
      setIsScrolling(false);
      detectCenterItem();
    }, 150);
  };

  const detectCenterItem = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const containerCenter = container.scrollLeft + container.offsetWidth / 2;
    
    let closestId = items[0]?.id;
    let minDistance = Infinity;

    const elements = container.querySelectorAll('.snap-item');
    elements.forEach((el, index) => {
      const elCenter = el.offsetLeft + el.offsetWidth / 2;
      const distance = Math.abs(containerCenter - elCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestId = items[index].id;
      }
    });

    if (closestId !== undefined && closestId !== activeId) {
      lastInternalId.current = closestId;
      onChange(closestId);
    }
  };

  const handleItemClick = (id) => {
    if (isScrolling) return; 
    lastInternalId.current = id;
    scrollToActive(id);
    onChange(id);
  };

  // Color logic mapping
  const activeBg = themeColor === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500';
  const activeBorder = themeColor === 'emerald' ? 'border-emerald-500' : 'border-blue-500';
  const dotDefault = '#cbd5e1';

  return (
    <div className="relative w-full py-1 overflow-hidden h-[42px]">
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-2 overflow-x-auto px-[calc(50%-56px)] scroll-smooth no-scrollbar"
        style={{ 
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => handleItemClick(item.id)}
            className={`snap-item shrink-0 w-28 h-[34px] rounded-full flex items-center justify-center gap-2 px-3 cursor-pointer transition-all duration-300 border shadow-sm ${
              activeId === item.id 
                ? `${activeBorder} ${activeBg} text-white z-10` 
                : 'border-slate-200 bg-white text-slate-500 opacity-60'
            }`}
            style={{ 
              scrollSnapAlign: 'center',
            }}
          >
            <div 
              className={`w-2 h-2 rounded-full shrink-0 ${activeId === item.id ? 'bg-white' : ''}`} 
              style={{ backgroundColor: activeId === item.id ? 'white' : (item.color || dotDefault) }}
            ></div>
            <span className="text-[10px] uppercase tracking-tight font-bold truncate">
              {item.name}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
